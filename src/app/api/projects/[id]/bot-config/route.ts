import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { MODEL_REGISTRY, DEFAULT_MODEL_ID, getModelsForTier } from "@/lib/model-registry";
import { getUserPlanAndUsage } from "@/lib/limits";

/**
 * GET /api/projects/[id]/bot-config
 * Returns the project's bot configuration.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;

        const project = await prisma.project.findUnique({
            where: { id: projectId, userId: session.user.id },
            select: {
                modelId: true,
                systemPrompt: true,
                temperature: true,
                maxTokens: true,
                persona: true,
                instructions: true,
                responseStyle: true,
                contextMessage: true,
                modules: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const { plan } = await getUserPlanAndUsage(session.user.id);

        return NextResponse.json({
            ...project,
            userPlan: plan,
            availableModels: MODEL_REGISTRY, // Full list — UI uses userPlan to show lock icons
        });
    } catch (error) {
        console.error("Bot config GET error:", error);
        return NextResponse.json(
            { error: "Failed to load bot configuration" },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/projects/[id]/bot-config
 * Updates the project's bot configuration.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;
        const body = await request.json();

        // Verify ownership
        const existing = await prisma.project.findUnique({
            where: { id: projectId, userId: session.user.id },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Validate modelId and enforce plan gating
        if (body.modelId) {
            const validModel = MODEL_REGISTRY.find((m) => m.id === body.modelId);
            if (!validModel) {
                return NextResponse.json(
                    { error: `Invalid model: ${body.modelId}` },
                    { status: 400 },
                );
            }
            const { plan } = await getUserPlanAndUsage(session.user.id);
            const allowedModels = getModelsForTier(plan);
            const isAllowed = allowedModels.some((m) => m.id === body.modelId);
            if (!isAllowed) {
                return NextResponse.json(
                    { error: `Model '${validModel.name}' requires the ${validModel.tier} plan or higher.` },
                    { status: 403 },
                );
            }
        }

        // Validate temperature
        if (body.temperature !== undefined) {
            const temp = Number(body.temperature);
            if (isNaN(temp) || temp < 0.1 || temp > 0.8) {
                return NextResponse.json(
                    { error: "Temperature must be between 0.1 and 0.8" },
                    { status: 400 },
                );
            }
        }

        // Validate responseStyle
        if (body.responseStyle && !["concise", "balanced", "detailed"].includes(body.responseStyle)) {
            return NextResponse.json(
                { error: "Response style must be: concise, balanced, or detailed" },
                { status: 400 },
            );
        }

        // Only allow known fields
        const updateData: Record<string, any> = {};
        const allowedFields = [
            "modelId",
            "systemPrompt",
            "temperature",
            "maxTokens",
            "persona",
            "instructions",
            "responseStyle",
            "contextMessage",
            "modules",
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        const updated = await prisma.project.update({
            where: { id: projectId },
            data: updateData,
            select: {
                modelId: true,
                systemPrompt: true,
                temperature: true,
                maxTokens: true,
                persona: true,
                instructions: true,
                responseStyle: true,
                contextMessage: true,
                modules: true,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Bot config PATCH error:", error);
        return NextResponse.json(
            { error: "Failed to update bot configuration" },
            { status: 500 },
        );
    }
}
