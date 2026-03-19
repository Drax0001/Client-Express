import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/projects/[id]/analytics
 * Returns daily message counts, hourly distribution, fallback rate, top questions, and locale breakdown.
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

    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const conversations = await prisma.projectConversation.findMany({
            where: { projectId },
            select: { id: true, module: true },
        });
        const convIds = conversations.map(c => c.id);

        const messages = await prisma.projectChatMessage.findMany({
            where: {
                conversationId: { in: convIds },
                createdAt: { gte: startDate, lte: endDate },
            },
            select: { createdAt: true, role: true, conversationId: true, wasResolved: true },
        });

        // Daily chart (we graph all messages, or just user messages? The chart usually shows traffic. Let's use only user messages for the graph to match the usage!)
        const userMessages = messages.filter(m => m.role === "user");

        const dailyMap: Record<string, number> = {};
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (const msg of userMessages) {
            const d = new Date(msg.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            dailyMap[key] = (dailyMap[key] || 0) + 1;
        }
        const dailyData: { name: string; date: string; messages: number }[] = [];
        const cur = new Date(startDate);
        while (cur <= endDate) {
            const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            dailyData.push({ name: dayNames[cur.getDay()], date: key, messages: dailyMap[key] || 0 });
            cur.setDate(cur.getDate() + 1);
        }

        // Hourly distribution (based on user messages)
        const hourlyMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
        for (const msg of userMessages) hourlyMap[new Date(msg.createdAt).getHours()]++;
        const fmtHour = (h: number) => h === 0 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`;
        const hourlyData = Object.entries(hourlyMap)
            .map(([h, r]) => ({ name: fmtHour(parseInt(h)), requests: r }))
            .filter(x => x.requests > 0)
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 10);

        // Stats
        const totalMessages = userMessages.length; // use ONLY user messages for the stat!
        const totalConversations = conversations.length;
        const avgMessagesPerConv = totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

        // Fallback rate
        const assistantMsgs = messages.filter(m => m.role === "assistant");
        const unresolvedCount = assistantMsgs.filter(m => !m.wasResolved).length;
        const fallbackRate = assistantMsgs.length > 0 ? Math.round((unresolvedCount / assistantMsgs.length) * 100) : 0;

        // Top questions (30d)
        const userMsgs30d = await prisma.projectChatMessage.findMany({
            where: { conversationId: { in: convIds }, role: "user", createdAt: { gte: since30d } },
            select: { content: true },
            take: 300,
        });
        const qFreq: Record<string, number> = {};
        for (const m of userMsgs30d) {
            const key = m.content.trim().toLowerCase().slice(0, 120);
            qFreq[key] = (qFreq[key] || 0) + 1;
        }
        const topQuestions = Object.entries(qFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([question, count]) => ({ question, count }));

        // Locale breakdown (30d)
        const localeMsgs = await prisma.projectChatMessage.findMany({
            where: { conversationId: { in: convIds }, role: "user", locale: { not: null }, createdAt: { gte: since30d } },
            select: { locale: true },
        });
        const lFreq: Record<string, number> = {};
        for (const m of localeMsgs) {
            const l = m.locale ?? "unknown";
            lFreq[l] = (lFreq[l] || 0) + 1;
        }
        const localeBreakdown = Object.entries(lFreq)
            .sort((a, b) => b[1] - a[1])
            .map(([locale, count]) => ({ locale, count }));

        return NextResponse.json({
            dailyData,
            moduleData: hourlyData,
            stats: { totalMessages, totalConversations, avgMessagesPerConv, fallbackRate, unresolvedCount },
            topQuestions,
            localeBreakdown,
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
