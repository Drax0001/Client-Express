/**
 * POST /api/chat - Send a message to a chatbot
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat.service";
import { errorHandler } from "@/lib/error-handler";
import { auth } from "@/lib/auth";
import { checkAndTrackMessageLimit } from "@/lib/limits";
import { prisma } from "../../../../lib/prisma";

/**
 * POST /api/chat
 * Send a message to a chatbot and get a response
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    console.log("API: Chat - received request:", {
      projectId: body.projectId,
      messageLength: body.message?.length,
      conversationId: body.conversationId,
      hasSessionId: !!body.sessionId,
    });

    // Validate required fields
    if (!body.projectId) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "projectId is required",
        },
        { status: 400 },
      );
    }

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
    const { projectId, message, conversationId, sessionId, userContext } = body;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ENFORCE PRICING PLAN LIMITS
    const limitCheck = await checkAndTrackMessageLimit(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "Plan Limit Exceeded", details: limitCheck.error },
        { status: 403 },
      );
    }

    // Detect locale from Accept-Language header
    const locale = request.headers.get("accept-language")?.split(",")[0]?.split(";")[0]?.split("-")[0] ?? null;

    console.log(`API: Chat - processing message for project ${projectId}`);

    // Process the chat message using project-level RAG pipeline
    const chatService = new ChatService(session?.user?.id);
    const result = await chatService.processQuery({
      projectId,
      message: message.trim(),
      conversationHistory: body.conversationHistory,
      userContext: userContext ?? null,
    });

    const wasResolved = result.sourceCount > 0;

    // Persist messages to conversation if conversationId is provided
    if (body.conversationId) {
      try {
        await prisma.projectChatMessage.createMany({
          data: [
            { conversationId: body.conversationId, role: "user",      content: message.trim(), locale, wasResolved: true },
            { conversationId: body.conversationId, role: "assistant", content: result.answer,  locale, wasResolved },
          ],
        });
        await prisma.projectConversation.update({
          where: { id: body.conversationId },
          data: { updatedAt: new Date() },
        });
      } catch (e) {
        console.error("Failed to persist conversation messages:", e);
      }
    }


    console.log(`API: Chat - response generated for project ${projectId}`);

    return NextResponse.json(
      {
        answer: result.answer,
        sourceCount: result.sourceCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API: Chat - unexpected error:", error);

    // Handle specific chatbot errors
    if (error instanceof Error) {
      if (error.message === "Chatbot not found") {
        return NextResponse.json(
          {
            error: "Chatbot not found",
            details: "The requested chatbot does not exist",
          },
          { status: 404 },
        );
      }

      if (
        error.message.includes("not ready") ||
        error.message.includes("training")
      ) {
        return NextResponse.json(
          {
            error: "Chatbot not ready",
            details: error.message,
          },
          { status: 400 },
        );
      }
    }

    return errorHandler(error);
  }
}
