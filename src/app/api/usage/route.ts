import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlanAndUsage } from "@/lib/limits";

/**
 * GET /api/usage
 * Returns the current user's plan, monthly limits, and current usage trackers.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const usageData = await getUserPlanAndUsage(session.user.id);

        return NextResponse.json(usageData, { status: 200 });

    } catch (error) {
        console.error("Usage API error:", error);
        return NextResponse.json({ error: "Failed to load usage data" }, { status: 500 });
    }
}
