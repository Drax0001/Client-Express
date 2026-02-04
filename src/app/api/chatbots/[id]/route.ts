/**
 * GET /api/chatbots/:id - Get individual chatbot details
 * DELETE /api/chatbots/:id - Delete a chatbot
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { NextRequest, NextResponse } from "next/server";
import { ChatbotService } from "@/services/chatbot.service";
import { errorHandler } from "@/lib/error-handler";

const chatbotService = new ChatbotService();

/**
 * GET /api/chatbots/:id
 * Get detailed information about a specific chatbot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`API: Get chatbot - fetching chatbot ${id}`);

    const chatbot = await chatbotService.getChatbot(id);

    console.log(`API: Get chatbot - returning chatbot ${id} with ${chatbot.statistics.totalConversations} conversations`);

    return NextResponse.json(chatbot, { status: 200 });

  } catch (error) {
    console.error(`API: Get chatbot ${params} - error:`, error);

    if (error instanceof Error && error.message === "Chatbot not found") {
      return NextResponse.json(
        {
          error: "Chatbot not found",
          details: "The requested chatbot does not exist",
        },
        { status: 404 }
      );
    }

    return errorHandler(error);
  }
}

/**
 * DELETE /api/chatbots/:id
 * Delete a chatbot and all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`API: Delete chatbot - deleting chatbot ${id}`);

    const result = await chatbotService.deleteChatbot(id);

    console.log(`API: Delete chatbot - deleted chatbot ${id} with ${result.deletedConversations} conversations and ${result.deletedTrainingSessions} training sessions`);

    return NextResponse.json({
      message: "Chatbot deleted successfully",
      ...result,
    }, { status: 200 });

  } catch (error) {
    console.error(`API: Delete chatbot ${params} - error:`, error);

    if (error instanceof Error && error.message === "Chatbot not found") {
      return NextResponse.json(
        {
          error: "Chatbot not found",
          details: "The requested chatbot does not exist",
        },
        { status: 404 }
      );
    }

    return errorHandler(error);
  }
}