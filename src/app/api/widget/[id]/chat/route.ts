import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat.service";
import { errorHandler } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { checkAndTrackMessageLimit } from "@/lib/limits";

/**
 * POST /api/widget/[id]/chat
 * Public endpoint for the embeddable chat widget.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Await params before using them to fix Next.js 15+ async params warning
        const { id: projectId } = await params;
        const body = await request.json();

        if (
            !body.message ||
            typeof body.message !== "string" ||
            body.message.trim().length === 0
        ) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: "message is required and must be a non-empty string",
                },
                { status: 400 },
            );
        }

        // 2. Load the project to determine the owner
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, documentCount: true },
        });

        if (!project || !project.userId) {
            return NextResponse.json(
                { error: "Chatbot not found" },
                { status: 404 }
            );
        }

        if (project.documentCount === 0) {
            return NextResponse.json(
                { error: "This chatbot is not yet trained with any documents." },
                { status: 400 }
            );
        }

        // 3. Enforce the Project Owner's pricing plan limits
        const limitCheck = await checkAndTrackMessageLimit(project.userId);
        if (!limitCheck.allowed) {
            return NextResponse.json(
                { error: "This chatbot has exceeded its plan limits." },
                { status: 403 }
            );
        }

        // 4. Process the query using ChatService
        const chatService = new ChatService(project.userId);
        const result = await chatService.processQuery({
            projectId,
            message: body.message.trim(),
            conversationHistory: body.conversationHistory,
        });

        return NextResponse.json(
            {
                answer: result.answer,
                sourceCount: result.sourceCount,
            },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "Chatbot not found" || error.message.includes("Project")) {
                return NextResponse.json(
                    {
                        error: "Chatbot not found",
                        details: "The requested chatbot does not exist",
                    },
                    { status: 404 },
                );
            }
        }
        return errorHandler(error);
    }
}
