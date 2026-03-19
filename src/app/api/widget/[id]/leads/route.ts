import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

/**
 * POST /api/widget/[id]/leads
 * Public endpoint — collects a lead before the chat starts.
 * No authentication required (widget is embedded on external sites).
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, leadCaptureEnabled: true },
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.leadCaptureEnabled) {
        return NextResponse.json({ error: "Lead capture is not enabled for this project" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    // At least one field required
    if (!name && !email && !phone) {
        return NextResponse.json({ error: "At least one field (name, email, or phone) is required" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
        data: {
            projectId,
            name: name?.trim() || null,
            email: email?.trim() || null,
            phone: phone?.trim() || null,
        },
        select: { id: true, collectedAt: true },
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
}
