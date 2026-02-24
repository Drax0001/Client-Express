import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/projects/[id]/conversations - List conversations for a project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const conversations = await prisma.projectConversation.findMany({
        where: { projectId, userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            module: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { messages: true } },
        },
    });

    return NextResponse.json(conversations);
}

/**
 * POST /api/projects/[id]/conversations - Create a new conversation
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    const conversation = await prisma.projectConversation.create({
        data: {
            projectId,
            userId: session.user.id,
            title: body.title || "New Conversation",
            module: body.module || null,
        },
    });

    return NextResponse.json(conversation, { status: 201 });
}
