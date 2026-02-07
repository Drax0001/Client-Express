/**
 * POST /api/chat - Send a message to a chatbot
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat.service";
import { errorHandler } from "@/lib/error-handler";
import { auth } from "@/lib/auth";

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
    const { projectId, message, conversationId, sessionId } = body;

    console.log(`API: Chat - processing message for project ${projectId}`);

    // Process the chat message using project-level RAG pipeline
    const chatService = new ChatService(session?.user?.id);
    const result = await chatService.processQuery({
      projectId,
      message: message.trim(),
      conversationHistory: body.conversationHistory,
    });

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
