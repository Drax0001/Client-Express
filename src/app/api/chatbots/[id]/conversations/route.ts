/**
 * GET /api/chatbots/[id]/conversations - List conversations
 * Requirements: 6.1-6.8
 */

import { NextRequest, NextResponse } from "next/server"
import { ConversationService } from "@/services/conversation.service"
import { errorHandler } from "@/lib/error-handler"

const conversationService = new ConversationService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatbotId } = await params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")))
    const search = searchParams.get("search") ?? undefined
    const userId = "default"

    const result = await conversationService.listConversations(
      chatbotId,
      userId,
      page,
      limit,
      search
    )
    return NextResponse.json(result)
  } catch (err) {
    return errorHandler(err)
  }
}
