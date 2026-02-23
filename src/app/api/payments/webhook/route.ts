import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * POST /api/payments/webhook
 * Receives async transaction updates from CamPay when a USSD push completes.
 */
export async function POST(request: NextRequest) {
  try {
    // CamPay sends JSON payload
    const body = await request.json();

    // Validate signature here using your Webhook Secret if configured in CamPay dashboard
    // const signature = request.headers.get("x-campay-signature");

    console.log("CamPay Webhook Received:", body);

    const { status, external_reference } = body;

    // We only care about SUCCESSFUL payments
    if (status === "SUCCESSFUL" && external_reference) {
      // Parse external reference: txn_userId_planName_timestamp
      const parts = external_reference.split("_");
      if (parts.length >= 4 && parts[0] === "txn") {
        const userId = parts[1];
        const plan = parts[2] as "PRO" | "BUSINESS";

        // Calculate expiration date (1 month from now)
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Update or create the subscription
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan,
            status: "active",
            expiresAt,
            camPaySubscriptionId: body.reference, // Internal CamPay Ref
          },
          create: {
            userId,
            plan,
            status: "active",
            expiresAt,
            camPaySubscriptionId: body.reference,
          },
        });

        // Reset usage tracker so the user starts fresh on their new plan
        // This gives them a clean billing cycle from the payment date
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

        console.log(
          `Successfully upgraded user ${userId} to ${plan} and reset usage tracker. Expires: ${expiresAt.toISOString()}`,
        );
      }
    }

    // CamPay requires a 200 OK so it doesn't retry
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Still return 200 or CamPay retries aggressively
    return NextResponse.json({ error: "Processing failed" }, { status: 200 });
  }
}
