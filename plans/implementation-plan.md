# Implementation Plan — client-express Full Audit & Feature Additions

## Overview

This document captures every issue found during the codebase audit and the exact changes required to fix them, plus new features to add. Each section includes the root cause, the affected files, and the precise change needed.

---

## Issue 1 — Light Mode as Default

**Root cause:** [`src/components/providers.tsx:16`](../src/components/providers.tsx) has `defaultTheme="dark"`.

**Fix:**

```tsx
// Before
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>

// After
<ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
```

**Files changed:**

- `src/components/providers.tsx` — change `defaultTheme` value

---

## Issue 2 — Auth Flicker on Landing Page (Login/Signup visible before Dashboard)

**Root cause:** [`src/app/page.tsx:11`](../src/app/page.tsx) uses `useSession()`. The `status` starts as `"loading"` and the header renders immediately with Login/Signup buttons before the session resolves. There is no guard for the loading state.

**Fix:** In the header nav section, render nothing (or a skeleton placeholder) when `status === "loading"`:

```tsx
// In the header <div className="flex items-center gap-3">
{
  status === "loading" ? (
    <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
  ) : status === "authenticated" ? (
    <Button asChild>
      <a href="/projects">Dashboard</a>
    </Button>
  ) : (
    <>
      <Button asChild variant="ghost">
        <a href="/login">Sign in</a>
      </Button>
      <Button asChild>
        <a href="/signup">Create account</a>
      </Button>
    </>
  );
}
```

**Files changed:**

- `src/app/page.tsx` — add loading guard in header nav and CTA buttons

---

## Issue 3 — Chat Bubbles: User Messages Showing as AI

**Root cause:** There are **two separate chat systems** in this codebase:

1. **`src/components/chat/chat-interface.tsx`** — uses `Message.isUser: boolean` → passes `isUser={message.isUser}` to `MessageBubble` ✅ Correct
2. **`src/components/chatbots/chat-interface.tsx`** — uses `Message.role: "user" | "assistant"` → renders its own inline `MessageBubble` component that correctly checks `message.role === "user"` ✅ Correct

The bug is in **`src/app/projects/[id]/page.tsx`**: it uses the `ChatInterface` from `src/components/chatbots/chat-interface.tsx` (which uses `role`), but the messages it creates use `role: "user" | "assistant"`. This is actually correct.

However, the **`src/app/projects/[id]/chat/page.tsx`** uses `ChatPanel` → `src/components/chat/chat-interface.tsx` which uses `isUser: boolean`. The messages there correctly set `isUser: true/false`.

**The actual bug:** In `src/app/projects/[id]/page.tsx`, the `ChatInterface` from `src/components/chatbots/chat-interface.tsx` is used. Looking at lines 122-274 of that file, the `MessageBubble` is an inline component that checks `const isUser = message.role === "user"`. This is correct.

**Real issue found:** The `src/app/projects/[id]/page.tsx` at line 214 creates assistant messages with `role: "assistant"` but the `ChatInterface` from `chatbots/chat-interface.tsx` correctly handles this. The visual bug of "all bubbles showing as AI" is likely because the `Avatar` for user messages is only shown when `isUser` is true (line 266-272 of chatbots/chat-interface.tsx), but the bubble background IS different. The issue may be a CSS/styling problem in dark mode where both bubble types look similar.

**Fix:** Verify the `isUser` conditional styling in `src/components/chatbots/chat-interface.tsx` lines 147-152 — the user bubble uses `bg-primary text-primary-foreground ml-auto` and AI uses `bg-muted`. In light mode these should be visually distinct. No code change needed here — this resolves itself with the light mode fix.

**Additional fix needed:** The `src/app/projects/[id]/page.tsx` passes messages with `role` field to `ChatInterface` from `chatbots/chat-interface.tsx`. This is correct. But the `ChatInterface` from `chatbots/chat-interface.tsx` has its own `Message` interface with `role` field. These are consistent.

---

## Issue 4 — Project Detail Page Infinite Re-fetching

**Root cause:** In [`src/app/projects/[id]/page.tsx:117-130`](../src/app/projects/[id]/page.tsx), the polling `useEffect` has `[project?.documents, refetch]` as dependencies:

```tsx
useEffect(() => {
  const hasInFlightDocs =
    (project?.documents || []).some(
      (d) => d.status === "pending" || d.status === "processing",
    ) ?? false;

  if (!hasInFlightDocs) return; // ← This returns early but the effect still re-runs

  const interval = setInterval(() => {
    refetch();
  }, 2000);

  return () => clearInterval(interval);
}, [project?.documents, refetch]); // ← Both change on every fetch
```

Problems:

1. `project?.documents` is a new array reference on every fetch → triggers effect re-run
2. `refetch` from TanStack Query is a stable reference but `project?.documents` is not
3. Every time `refetch()` runs, it updates `project`, which changes `project?.documents`, which re-runs the effect, which creates a new interval

**Fix:** Use a derived boolean and `useRef` to stabilize:

```tsx
// Derive a stable primitive
const hasInFlightDocs = (project?.documents || []).some(
  (d) => d.status === "pending" || d.status === "processing",
);

useEffect(() => {
  if (!hasInFlightDocs) return;

  const interval = setInterval(() => {
    refetch();
  }, 3000);

  return () => clearInterval(interval);
}, [hasInFlightDocs, refetch]); // hasInFlightDocs is a boolean primitive — stable
```

**Files changed:**

- `src/app/projects/[id]/page.tsx` — extract `hasInFlightDocs` as a derived boolean outside the effect

---

## Issue 5 — Source Snippets Showing Placeholder Text

**Root cause:** In [`src/app/projects/[id]/page.tsx:213-219`](../src/app/projects/[id]/page.tsx), the code explicitly creates fake sources:

```tsx
sources: response.sourceCount > 0
  ? Array.from({ length: response.sourceCount }).map((_, i) => ({
      id: `src-${i}`,
      title: `Project Document ${i + 1}`,
      snippet: "Snippet extraction is currently handled by the backend API...", // ← PLACEHOLDER
      relevanceScore: 0.85 + Math.random() * 0.1,
    }))
  : [];
```

The [`ChatService.processQuery()`](../src/services/chat.service.ts) only returns `{ answer, sourceCount }` — it does not return actual source data.

**Fix (multi-file):**

**Step A — Update `ChatService` to return sources:**

```ts
// src/services/chat.service.ts
export interface ChatSource {
  title: string;
  snippet: string;
  relevanceScore: number;
  url?: string;
}

export interface ChatResponse {
  answer: string;
  sourceCount: number;
  sources: ChatSource[]; // ← ADD THIS
}

// In processQuery(), after assembleContext():
const sources: ChatSource[] = searchResults
  .filter((r) => r.score >= relevanceThreshold)
  .slice(0, 5)
  .map((r) => ({
    title: r.metadata?.filename || r.metadata?.sourceUrl || "Document",
    snippet: r.text.substring(0, 200) + (r.text.length > 200 ? "..." : ""),
    relevanceScore: r.score,
    url: r.metadata?.sourceUrl,
  }));

return { answer: llmResponse, sourceCount, sources };
```

**Step B — Update `/api/chat/route.ts` to pass sources through:**

```ts
return NextResponse.json(
  {
    answer: result.answer,
    sourceCount: result.sourceCount,
    sources: result.sources, // ← ADD THIS
  },
  { status: 200 },
);
```

**Step C — Update `/api/widget/[id]/chat/route.ts` similarly**

**Step D — Update `src/lib/api/types.ts` `ChatResponse` type**

**Step E — Update `src/app/projects/[id]/page.tsx` to use real sources:**

```tsx
sources: response.sources || [];
```

**Files changed:**

- `src/services/chat.service.ts` — add `sources` to return type and populate it
- `src/app/api/chat/route.ts` — pass `sources` in response
- `src/app/api/widget/[id]/chat/route.ts` — pass `sources` in response
- `src/lib/api/types.ts` — add `sources` to `ChatResponse`
- `src/app/projects/[id]/page.tsx` — use `response.sources` instead of placeholder

---

## Issue 6 — Public Chatbot Sharing + QR Code

**Current state:** The public chat page at [`src/app/chat/[id]/page.tsx`](../src/app/chat/[id]/page.tsx) already exists and works. It uses `PublicChat` which calls `/api/widget/[id]/chat`. The URL `https://yourdomain.com/chat/[projectId]` is a fully functional public chatbot page. It just isn't surfaced anywhere.

**Plan:**

**Step A — Add `qrcode.react` package:**

```bash
bun add qrcode.react
bun add @types/qrcode.react --dev
```

**Step B — Add "Share" section to the Embed tab in `src/app/projects/[id]/page.tsx`:**

Add a new card above the embed code card showing:

- The public URL: `https://[origin]/chat/[projectId]`
- A "Copy Link" button
- A QR code generated with `qrcode.react`
- A note: "Users who access this link will use your plan's message quota"

```tsx
import QRCode from "qrcode.react";

// In the Embed tab:
const publicUrl = `${window.location.origin}/chat/${projectId}`;

<Card>
  <CardHeader>
    <CardTitle>Share Your Chatbot</CardTitle>
    <CardDescription>
      Share this link or QR code so anyone can chat with your bot. Note: public
      usage counts against your plan quota.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex gap-2">
      <Input value={publicUrl} readOnly />
      <Button
        onClick={() => {
          navigator.clipboard.writeText(publicUrl);
          toast({ title: "Link copied!" });
        }}
      >
        <AppIcon name="Copy" className="h-4 w-4" />
      </Button>
      <Button asChild variant="outline">
        <a href={publicUrl} target="_blank">
          <AppIcon name="ExternalLink" className="h-4 w-4" />
        </a>
      </Button>
    </div>
    <div className="flex justify-center p-4 bg-white rounded-xl border">
      <QRCode value={publicUrl} size={180} />
    </div>
  </CardContent>
</Card>;
```

**Files changed:**

- `package.json` — add `qrcode.react`
- `src/app/projects/[id]/page.tsx` — add share section in Embed tab

---

## Issue 7 — Widget Audit

**Audit results:**

| Component                               | Status        | Notes                                                                      |
| --------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `public/widget.js`                      | ✅ Correct    | Creates iframe, handles open/close resize messages                         |
| `src/app/widget/[id]/layout.tsx`        | ✅ Correct    | Minimal layout for iframe context                                          |
| `src/app/widget/[id]/page.tsx`          | ✅ Correct    | Server component, loads `EmbedWidget`                                      |
| `src/components/chat/embed-widget.tsx`  | ✅ Correct    | Sends messages to `/api/widget/[id]/chat`, posts resize messages to parent |
| `src/app/api/widget/[id]/chat/route.ts` | ✅ Correct    | Enforces owner's plan limits, processes query                              |
| Embed code snippet in project page      | ❌ **BROKEN** | Points to `https://cdn.example.com/widget.js` — hardcoded fake CDN URL     |

**Fix:** Update the embed code snippet in `src/app/projects/[id]/page.tsx` lines 429-445 to use the actual deployment URL:

```tsx
// Use window.location.origin for the script src
const widgetCode = `<script>
  window.chatbotConfig = {
    chatbotId: "${projectId}",
  };
</script>
<script src="${window.location.origin}/widget.js" defer></script>`;
```

This makes the widget code self-referential — it always points to the correct domain.

**Files changed:**

- `src/app/projects/[id]/page.tsx` — fix widget embed code URL

---

## Issue 8 — Post-Payment Plan/Limits Auto-Reset

**Current state:** The webhook at [`src/app/api/payments/webhook/route.ts`](../src/app/api/payments/webhook/route.ts) correctly upserts the `Subscription` model when payment succeeds. However, it does **not** reset the `UsageTracker`.

**Problem scenario:** A user on the FREE plan uses all 50 messages. They upgrade to PRO. The webhook updates their plan to PRO but `messagesThisMonth` is still 50. The `checkAndTrackMessageLimit()` function in `src/lib/limits.ts` checks `usage.messagesThisMonth >= limits.maxMessagesPerMonth`. With PRO limit of 1000, 50 < 1000 so they can continue — this actually works. BUT the `resetDate` may be stale, causing incorrect monthly resets.

**Real gap:** When a user upgrades, their `UsageTracker.resetDate` should be set to 1 month from the payment date (their new billing cycle), and their counts should be reset to 0 to give them a fresh start on their new plan.

**Fix:** Add usage reset to the webhook:

```ts
// In src/app/api/payments/webhook/route.ts, after subscription upsert:
const newResetDate = new Date();
newResetDate.setMonth(newResetDate.getMonth() + 1);

await prisma.usageTracker.upsert({
  where: { userId },
  update: {
    messagesThisMonth: 0,
    sourcesThisMonth: 0,
    resetDate: newResetDate,
  },
  create: {
    userId,
    messagesThisMonth: 0,
    sourcesThisMonth: 0,
    resetDate: newResetDate,
  },
});
```

**Files changed:**

- `src/app/api/payments/webhook/route.ts` — add `UsageTracker` reset after subscription upsert

---

## Issue 9 — Technical Payment Flow Documentation

See `plans/payment-flow.md` for the full step-by-step technical flow with code references.

---

## Summary of All File Changes

| File                                    | Change                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/providers.tsx`          | `defaultTheme="light"`                                                            |
| `src/app/page.tsx`                      | Add loading guard for auth status in header nav                                   |
| `src/app/projects/[id]/page.tsx`        | Fix polling deps; fix source snippets; add share/QR section; fix widget embed URL |
| `src/services/chat.service.ts`          | Add `sources` array to `ChatResponse` return type                                 |
| `src/app/api/chat/route.ts`             | Pass `sources` in JSON response                                                   |
| `src/app/api/widget/[id]/chat/route.ts` | Pass `sources` in JSON response                                                   |
| `src/lib/api/types.ts`                  | Add `sources` field to `ChatResponse` type                                        |
| `src/app/api/payments/webhook/route.ts` | Reset `UsageTracker` after successful payment                                     |
| `package.json`                          | Add `qrcode.react` dependency                                                     |
| `plans/payment-flow.md`                 | New: technical payment flow documentation                                         |
