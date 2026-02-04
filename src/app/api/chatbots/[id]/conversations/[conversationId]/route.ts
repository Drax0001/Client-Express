/**
 * GET /api/chatbots/[id]/conversations/[conversationId] - Get conversation with messages
 * DELETE /api/chatbots/[id]/conversations/[conversationId] - Delete conversation
 */

import { NextRequest, NextResponse } from "next/server"
import { ConversationService } from "@/services/conversation.service"
import { errorHandler } from "@/lib/error-handler"

const conversationService = new ConversationService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  try {
    const { id: chatbotId, conversationId } = await params
    const conv = await conversationService.getConversation(conversationId, chatbotId)
    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(conv)
  } catch (err) {
    return errorHandler(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  try {
    const { id: chatbotId, conversationId } = await params
    await conversationService.deleteConversation(conversationId, chatbotId)
    return NextResponse.json({ message: "Conversation deleted" })
  } catch (err) {
    return errorHandler(err)
  }
}
