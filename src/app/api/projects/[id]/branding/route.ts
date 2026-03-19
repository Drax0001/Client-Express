import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { getUserPlanAndUsage } from "@/lib/limits";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { plan } = await getUserPlanAndUsage(session.user.id);

    // Enforce showBranding: false only for BUSINESS plans
    let showBranding = body.showBranding;
    if (showBranding === false && plan !== "BUSINESS") {
        showBranding = true; // Force to true if not on BUSINESS plan
    }

    const branding = {
        primaryColor: body.primaryColor,
        userBubbleColor: body.userBubbleColor,
        botBubbleColor: body.botBubbleColor,
        headerColor: body.headerColor,
        logoUrl: body.logoUrl,
        chatbotDisplayName: body.chatbotDisplayName,
        welcomeMessage: body.welcomeMessage,
        theme: body.theme,
        showBranding: showBranding,
        suggestedMessages: body.suggestedMessages,
        footerLinks: body.footerLinks,
    };

    const updated = await prisma.project.update({
        where: { id: projectId },
        data: { branding },
    });

    return NextResponse.json({ success: true, branding: updated.branding });
}
