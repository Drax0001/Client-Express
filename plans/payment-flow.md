# Technical Payment Flow — ClientExpress 

## Overview

This document describes the complete technical flow for subscription payments using CamPay (Cameroon Mobile Money). The system uses a USSD push model: the server initiates a payment request to the user's phone, and CamPay calls back a webhook when the transaction completes.

---

## Architecture

```
User Browser          Next.js Server           CamPay API           Database (Postgres)
     |                      |                       |                       |
     |-- POST /checkout ---> |                       |                       |
     |                      |-- getToken() -------> |                       |
     |                      |<-- token ------------ |                       |
     |                      |-- requestCollect() -> |                       |
     |                      |<-- { reference } ---- |                       |
     |<-- { reference } --- |                       |                       |
     |                      |                       |                       |
     | (polls every 5s)     |                       | (user approves USSD)  |
     |-- GET /status ------> |                       |                       |
     |                      |-- query subscription -> |                     |
     |                      |<-- { active: false } -- |                     |
     |                      |                       |                       |
     |                      |                       |-- POST /webhook ----> |
     |                      |<-- webhook received -- |                      |
     |                      |                       |    upsert Subscription|
     |                      |                       |    reset UsageTracker |
     |                      |                       |                       |
     |-- GET /status ------> |                       |                       |
     |                      |-- query subscription -> |                     |
     |                      |<-- { active: true } --- |                     |
     |<-- { active: true } - |                       |                       |
     | (redirect /projects) |                       |                       |
```

---

## Step-by-Step Flow

### Step 1 — User Selects a Plan

**Location:** [`src/app/page.tsx`](../src/app/page.tsx) — Pricing section

The landing page displays three plans: Free, Pro (5,000 FCFA/mo), Business (15,000 FCFA/mo). Clicking "Upgrade to Pro" navigates to:

```
/checkout?plan=PRO
```

---

### Step 2 — Checkout Page Loads

**Location:** [`src/app/checkout/page.tsx`](../src/app/checkout/page.tsx)

```tsx
// Line 17: Extract plan from URL
const plan = searchParams?.get("plan")?.toUpperCase() as "PRO" | "BUSINESS";

// Line 22-26: Redirect if invalid plan
useEffect(() => {
  if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
    router.replace("/");
  }
}, [plan, router]);
```

The user enters their Mobile Money number (format: `237XXXXXXXXX`, 12 digits).

---

### Step 3 — Initiate Payment

**Location:** [`src/app/checkout/page.tsx:59-98`](../src/app/checkout/page.tsx) → [`src/app/api/payments/checkout/route.ts`](../src/app/api/payments/checkout/route.ts)

**Frontend call:**

```ts
// checkout/page.tsx line 72-76
const res = await fetch("/api/payments/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ plan, phoneNumber }),
});
```

**Backend handler:**

```ts
// src/app/api/payments/checkout/route.ts

// 1. Authenticate user
const session = await auth();  // line 9

// 2. Validate plan and phone number
if (!["PRO", "BUSINESS"].includes(plan)) { ... }  // line 17
if (!phoneNumber || !/^237\d{9}$/.test(phoneNumber)) { ... }  // line 22

// 3. Determine price
const price = plan === "PRO" ? 5000 : 15000;  // line 26

// 4. Generate correlation ID for webhook matching
const externalReference = `txn_${session.user.id}_${plan}_${Date.now()}`;  // line 29
// Format: txn_<userId>_<PLAN>_<timestamp>

// 5. Call CamPay
const campayResponse = await CamPayService.requestCollect({
  amount: price,
  currency: "XAF",
  phoneNumber,
  description: `${plan} Plan Subscription for chat-remix`,
  externalReference,
});  // line 34-40

// 6. Return CamPay reference to frontend
return NextResponse.json({
  success: true,
  reference: campayResponse.reference,
  externalReference
});  // line 42-46
```

---

### Step 4 — CamPay Token Acquisition

**Location:** [`src/lib/campay.ts:11-28`](../src/lib/campay.ts)

Before every CamPay API call, a fresh token is obtained:

```ts
private static async getToken(): Promise<string> {
  const res = await fetch(`${this.baseUrl}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.CAMPAY_APP_USERNAME,
      password: process.env.CAMPAY_APP_PASSWORD,
    }),
  });
  const data = await res.json();
  return data.token;
}
```

**Environment variables required:**

- `CAMPAY_APP_USERNAME` — CamPay application username
- `CAMPAY_APP_PASSWORD` — CamPay application password

---

### Step 5 — CamPay USSD Push

**Location:** [`src/lib/campay.ts:33-63`](../src/lib/campay.ts)

```ts
static async requestCollect(params: { ... }) {
  const token = await this.getToken();

  const res = await fetch(`${this.baseUrl}/collect/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount.toString(),
      currency: params.currency || "XAF",
      from: params.phoneNumber,
      description: params.description,
      external_reference: params.externalReference,  // ← Our correlation ID
    }),
  });

  return res.json(); // { reference: "campay_txn_ref", status: "PENDING", ... }
}
```

CamPay sends a USSD prompt to the user's phone. The user approves the deduction.

---

### Step 6 — Frontend Polls for Payment Status

**Location:** [`src/app/checkout/page.tsx:29-53`](../src/app/checkout/page.tsx)

After initiating payment, the frontend enters a polling loop:

```ts
useEffect(() => {
  if (!waitingForPayment) return;

  const interval = setInterval(async () => {
    const res = await fetch("/api/payments/status");
    const data = await res.json();
    if (data.active) {
      setWaitingForPayment(false);
      clearInterval(interval);
      toast({
        title: "Payment Successful!",
        description: `You are now on the ${data.plan} plan.`,
      });
      router.replace("/projects");
    }
  }, 5000); // Every 5 seconds

  return () => clearInterval(interval);
}, [waitingForPayment, router, toast]);
```

**Status endpoint:** [`src/app/api/payments/status/route.ts`](../src/app/api/payments/status/route.ts)

```ts
const sub = await prisma.subscription.findUnique({
  where: { userId: session.user.id },
});

if (sub && sub.status === "active" && ["PRO", "BUSINESS"].includes(sub.plan)) {
  return NextResponse.json({ active: true, plan: sub.plan });
}
return NextResponse.json({ active: false });
```

---

### Step 7 — CamPay Webhook (Payment Confirmed)

**Location:** [`src/app/api/payments/webhook/route.ts`](../src/app/api/payments/webhook/route.ts)

When the user approves the USSD prompt, CamPay calls this endpoint:

```ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { status, external_reference } = body;

  if (status === "SUCCESSFUL" && external_reference) {
    // Parse: txn_<userId>_<PLAN>_<timestamp>
    const parts = external_reference.split("_");
    if (parts.length >= 4 && parts[0] === "txn") {
      const userId = parts[1];
      const plan = parts[2] as "PRO" | "BUSINESS";

      // Calculate 1-month expiry
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Update or create subscription
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          plan,
          status: "active",
          expiresAt,
          camPaySubscriptionId: body.reference,
        },
        create: {
          userId,
          plan,
          status: "active",
          expiresAt,
          camPaySubscriptionId: body.reference,
        },
      });

      // ⚠️ MISSING (to be added): Reset usage tracker
      await prisma.usageTracker.upsert({
        where: { userId },
        update: {
          messagesThisMonth: 0,
          sourcesThisMonth: 0,
          resetDate: expiresAt,
        },
        create: {
          userId,
          messagesThisMonth: 0,
          sourcesThisMonth: 0,
          resetDate: expiresAt,
        },
      });
    }
  }

  // Always return 200 to prevent CamPay retries
  return NextResponse.json({ received: true }, { status: 200 });
}
```

**Webhook URL to configure in CamPay dashboard:**

```
https://yourdomain.com/api/payments/webhook
```

---

### Step 8 — Plan Limits Enforcement

**Location:** [`src/lib/limits.ts`](../src/lib/limits.ts)

After upgrade, every API call checks the user's current plan:

```ts
export async function getUserPlanAndUsage(userId: string) {
  const [sub, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.usageTracker.findUnique({ where: { userId } }),
  ]);

  let plan = "FREE";
  if (sub && sub.status === "active") {
    if (!sub.expiresAt || new Date() < sub.expiresAt) {
      plan = sub.plan; // "PRO" or "BUSINESS"
    }
  }

  return { plan, limits: PLAN_LIMITS[plan], usage };
}
```

**Plan limits:**

```ts
export const PLAN_LIMITS = {
  FREE:     { maxProjects: 1,      maxSourcesTotal: 3,   maxMessagesPerMonth: 50,     maxSourceSizeBytes: 2MB  },
  PRO:      { maxProjects: 5,      maxSourcesTotal: 50,  maxMessagesPerMonth: 1000,   maxSourceSizeBytes: 10MB },
  BUSINESS: { maxProjects: 999999, maxSourcesTotal: 500, maxMessagesPerMonth: 999999, maxSourceSizeBytes: 50MB },
};
```

**Enforcement points:**

- Chat messages: [`src/app/api/chat/route.ts:59-65`](../src/app/api/chat/route.ts) calls `checkAndTrackMessageLimit()`
- Widget chat: [`src/app/api/widget/[id]/chat/route.ts:55-61`](../src/app/api/widget/[id]/chat/route.ts) — uses **project owner's** userId
- Document upload: [`src/app/api/documents/upload/route.ts`](../src/app/api/documents/upload/route.ts) calls `checkSourceLimit()`
- Project creation: [`src/app/api/projects/route.ts`](../src/app/api/projects/route.ts) calls `checkProjectLimit()`

---

## Data Models

### Subscription

```prisma
model Subscription {
  id                   String    @id @default(cuid())
  userId               String    @unique
  plan                 Plan      @default(FREE)  // FREE | PRO | BUSINESS
  camPaySubscriptionId String?   @unique
  expiresAt            DateTime?
  status               String    @default("active")  // "active" | "past_due" | "canceled"
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}
```

### UsageTracker

```prisma
model UsageTracker {
  id               String   @id @default(cuid())
  userId           String   @unique
  messagesThisMonth Int     @default(0)
  sourcesThisMonth  Int     @default(0)
  resetDate         DateTime  // Next billing cycle reset date
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Environment Variables Required

```env
# CamPay credentials
CAMPAY_APP_USERNAME=your_campay_username
CAMPAY_APP_PASSWORD=your_campay_password

# Auth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://...
```

---

## Security Considerations

1. **Webhook signature verification** — CamPay supports webhook signatures. The current implementation has a commented-out signature check at [`src/app/api/payments/webhook/route.ts:13-14`](../src/app/api/payments/webhook/route.ts). This should be enabled in production.

2. **External reference parsing** — The `external_reference` format `txn_<userId>_<PLAN>_<timestamp>` is parsed by splitting on `_`. If a userId contains underscores, this will break. Consider using a different delimiter or encoding.

3. **Idempotency** — The webhook uses `upsert` which is idempotent. CamPay may retry webhooks; the current implementation handles this correctly.

4. **Always return 200** — The webhook always returns HTTP 200 even on errors, to prevent CamPay from retrying aggressively. Errors are logged server-side.

---

## Testing the Payment Flow

### Development (Sandbox)

Change `CamPayService.baseUrl` to `https://demo.campay.net/api` for sandbox testing.

### Manual webhook test

```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESSFUL",
    "external_reference": "txn_USER_ID_PRO_1234567890",
    "reference": "campay_internal_ref"
  }'
```

### Check subscription status

```bash
curl http://localhost:3000/api/payments/status \
  -H "Cookie: next-auth.session-token=..."
```
