import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/projects/[id]/suggestions
 * Returns top unanswered or negatively-rated questions as knowledge gap suggestions.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify ownership
    const project = await prisma.project.findUnique({
        where: { id: projectId, userId: session.user.id },
        select: { id: true },
    });
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    try {
        const conversations = await prisma.projectConversation.findMany({
            where: { projectId },
            select: { id: true },
        });
        const convIds = conversations.map(c => c.id);

        // 1. User messages that were followed by an unresolved assistant response
        const unresolvedAssistant = await prisma.projectChatMessage.findMany({
            where: { conversationId: { in: convIds }, role: "assistant", wasResolved: false },
            select: { conversationId: true, createdAt: true },
        });

        // For each unresolved assistant message, find the preceding user message
        const suggestions: { question: string; type: "unresolved" | "negative" }[] = [];

        for (const msg of unresolvedAssistant) {
            const userMsg = await prisma.projectChatMessage.findFirst({
                where: {
                    conversationId: msg.conversationId,
                    role: "user",
                    createdAt: { lte: msg.createdAt },
                },
                orderBy: { createdAt: "desc" },
                select: { content: true },
            });
            if (userMsg) {
                suggestions.push({ question: userMsg.content.trim(), type: "unresolved" });
            }
        }

        // 2. User messages before negatively-rated assistant responses
        const negativeMsgs = await prisma.projectChatMessage.findMany({
            where: { conversationId: { in: convIds }, role: "assistant", rating: "negative" },
            select: { conversationId: true, createdAt: true },
        });

        for (const msg of negativeMsgs) {
            const userMsg = await prisma.projectChatMessage.findFirst({
                where: {
                    conversationId: msg.conversationId,
                    role: "user",
                    createdAt: { lte: msg.createdAt },
                },
                orderBy: { createdAt: "desc" },
                select: { content: true },
            });
            if (userMsg) {
                suggestions.push({ question: userMsg.content.trim(), type: "negative" });
            }
        }

        // Group by normalized question text
        const freq: Record<string, { count: number; type: "unresolved" | "negative" }> = {};
        for (const s of suggestions) {
            const key = s.question.toLowerCase().slice(0, 120);
            if (!freq[key]) freq[key] = { count: 0, type: s.type };
            freq[key].count++;
        }

        const result = Object.entries(freq)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([question, { count, type }]) => ({ question, count, type }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Suggestions error:", error);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
}
