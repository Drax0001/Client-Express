import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../../../../../lib/prisma";

/**
 * PATCH /api/projects/[id]/conversations/[convId]/messages/[msgId]/rate
 * Rate a message as positive or negative
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; convId: string; msgId: string } }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { msgId } = await params;
    const body = await request.json();

    if (!body.rating || !["positive", "negative"].includes(body.rating)) {
        return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const updated = await prisma.projectChatMessage.update({
        where: { id: msgId },
        data: { rating: body.rating },
    });

    return NextResponse.json({ success: true, rating: updated.rating });
}
