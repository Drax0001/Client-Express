import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CamPayService } from "@/lib/campay";
import { PLAN_LIMITS } from "@/lib/limits";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { plan, phoneNumber } = body; // e.g., plan: "PRO", phoneNumber: "237670000000"

        if (!["PRO", "BUSINESS"].includes(plan)) {
            return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
        }

        // Basic Cameroon phone number validation
        if (!phoneNumber || !/^237\d{9}$/.test(phoneNumber)) {
            return NextResponse.json({ error: "Invalid phone number format. Must be 237 followed by 9 digits." }, { status: 400 });
        }

        const price = plan === "PRO" ? 5000 : 15000;

        // Generate an external reference for linking the webhook
        const externalReference = `txn_${session.user.id}_${plan}_${Date.now()}`;

        // Record intention in DB (Optional, but good for tracking pending checkouts)
        // We'll trust the webhook for final activation

        const campayResponse = await CamPayService.requestCollect({
            amount: price,
            currency: "XAF",
            phoneNumber,
            description: `${plan} Plan Subscription for chat-remix`,
            externalReference,
        });

        return NextResponse.json({
            success: true,
            reference: campayResponse.reference,
            externalReference
        }, { status: 200 });

    } catch (error: any) {
        console.error("Checkout Error:", error);
        return NextResponse.json({ error: error.message || "Failed to initiate payment" }, { status: 500 });
    }
}
