import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

/**
 * PATCH /api/widget/[id]/rate
 * Public endpoint — allows widget users to rate an assistant message.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const body = await request.json();
    const { messageId, rating } = body;

    if (!messageId || !["positive", "negative"].includes(rating)) {
        return NextResponse.json({ error: "messageId and valid rating are required" }, { status: 400 });
    }

    // Verify the message belongs to this project
    const msg = await prisma.projectChatMessage.findUnique({
        where: { id: messageId },
        select: { id: true, conversation: { select: { projectId: true } } },
    });

    if (!msg || msg.conversation.projectId !== projectId) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await prisma.projectChatMessage.update({
        where: { id: messageId },
        data: { rating },
    });

    return NextResponse.json({ success: true });
}
