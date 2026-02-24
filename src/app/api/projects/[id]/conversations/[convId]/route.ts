import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../../lib/prisma";

/**
 * GET /api/projects/[id]/conversations/[convId] - Get messages for a conversation
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; convId: string } }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { convId } = await params;

    const conversation = await prisma.projectConversation.findUnique({
        where: { id: convId },
        include: {
            messages: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!conversation || conversation.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
}

/**
 * PATCH /api/projects/[id]/conversations/[convId] - End/update a conversation
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; convId: string } }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { convId } = await params;
    const body = await request.json();

    const conversation = await prisma.projectConversation.findUnique({
        where: { id: convId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.projectConversation.update({
        where: { id: convId },
        data: {
            status: body.status || conversation.status,
            title: body.title || conversation.title,
        },
    });

    return NextResponse.json(updated);
}

/**
 * DELETE /api/projects/[id]/conversations/[convId] - Delete a conversation
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; convId: string } }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { convId } = await params;

    const conversation = await prisma.projectConversation.findUnique({
        where: { id: convId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.projectConversation.delete({ where: { id: convId } });

    return NextResponse.json({ success: true });
}
