import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/projects/[id]/analytics - Get analytics data for a project
 * Returns daily message counts and module distribution
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Default: last 7 days
    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    try {
        // Get all conversations for this project
        const conversations = await prisma.projectConversation.findMany({
            where: { projectId },
            select: { id: true, module: true },
        });

        const convIds = conversations.map(c => c.id);

        // Get messages in the date range
        const messages = await prisma.projectChatMessage.findMany({
            where: {
                conversationId: { in: convIds },
                createdAt: { gte: startDate, lte: endDate },
            },
            select: {
                createdAt: true,
                role: true,
                conversationId: true,
            },
        });

        // Group by day for line chart
        const dailyMap: Record<string, number> = {};
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (const msg of messages) {
            const d = new Date(msg.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            dailyMap[key] = (dailyMap[key] || 0) + 1;
        }

        // Fill in missing days
        const dailyData: { name: string; date: string; messages: number }[] = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
            dailyData.push({
                name: dayNames[current.getDay()],
                date: key,
                messages: dailyMap[key] || 0,
            });
            current.setDate(current.getDate() + 1);
        }

        // Activity by Time of Day distribution (0-23 hours)
        const hourlyMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyMap[i] = 0;

        for (const msg of messages) {
            const hour = new Date(msg.createdAt).getHours();
            hourlyMap[hour]++;
        }

        const formatHour = (h: number) => {
            if (h === 0) return "12 AM";
            if (h === 12) return "12 PM";
            return h < 12 ? `${h} AM` : `${h - 12} PM`;
        };

        const hourlyData = Object.entries(hourlyMap)
            .map(([hourStr, requests]) => ({ name: formatHour(parseInt(hourStr)), requests }))
            .filter(item => item.requests > 0) // Only show hours with activity
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 10); // Show top 10 most active hours

        // Summary stats
        const totalMessages = messages.length;
        const totalConversations = conversations.length;
        const avgMessagesPerConv = totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

        return NextResponse.json({
            dailyData,
            moduleData: hourlyData, // Exposing hourly format over the old moduleData key for backward compatibility on frontend typings
            stats: {
                totalMessages,
                totalConversations,
                avgMessagesPerConv,
            },
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
