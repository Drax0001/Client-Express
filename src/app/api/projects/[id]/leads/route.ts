import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/projects/[id]/leads
 * Auth-guarded: returns paginated leads for a project.
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

    const project = await prisma.project.findUnique({
        where: { id: projectId, userId: session.user.id },
        select: { id: true },
    });
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where: { projectId },
            orderBy: { collectedAt: "desc" },
            skip,
            take: limit,
            select: { id: true, name: true, email: true, phone: true, collectedAt: true },
        }),
        prisma.lead.count({ where: { projectId } }),
    ]);

    return NextResponse.json({ leads, total, page, limit });
}
