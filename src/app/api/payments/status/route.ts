import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/payments/status
 * Check if the user's subscription has been activated
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sub = await prisma.subscription.findUnique({
            where: { userId: session.user.id }
        });

        if (sub && sub.status === "active" && ["PRO", "BUSINESS"].includes(sub.plan)) {
            return NextResponse.json({ active: true, plan: sub.plan }, { status: 200 });
        }

        return NextResponse.json({ active: false }, { status: 200 });
    } catch (error) {
        console.error("Status check error:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
