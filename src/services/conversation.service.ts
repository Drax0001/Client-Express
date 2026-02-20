/**
 * ConversationService - Conversation and message persistence
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { prisma } from "../../lib/prisma"

export interface CreateMessageInput {
  conversationId: string
  role: "user" | "assistant"
  content: string
  sources?: unknown[]
}

export interface ConversationWithMessages {
  id: string
  chatbotId: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  messages: {
    id: string
    role: string
    content: string
    sources: unknown
    createdAt: Date
  }[]
}

export class ConversationService {
  /**
   * Create or get conversation for chatbot
   */
  async getOrCreateConversation(
    chatbotId: string,
    userId: string = "default",
    conversationId?: string
  ): Promise<{ id: string; isNew: boolean }> {
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, chatbotId },
      })
      if (existing) return { id: existing.id, isNew: false }
    }

    const created = await prisma.conversation.create({
      data: {
        chatbotId,
        userId,
        title: `Conversation ${new Date().toISOString().slice(0, 10)}`,
      },
    })
    return { id: created.id, isNew: true }
  }

  /**
   * Add message to conversation
   */
  async addMessage(input: CreateMessageInput) {
    return prisma.chatMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        sources: (input.sources ?? null) as object,
      },
    })
  }

  /**
   * List conversations for a chatbot with pagination
   */
  async listConversations(
    chatbotId: string,
    userId: string = "default",
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    const skip = (page - 1) * limit
    const where: { chatbotId: string; userId?: string } = { chatbotId }
    if (userId) where.userId = userId

    if (search?.trim()) {
      const conversations = await prisma.conversation.findMany({
        where: {
          ...where,
          messages: {
            some: {
              content: { contains: search, mode: "insensitive" },
            },
          },
        },
        include: {
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      })
      const total = await prisma.conversation.count({
        where: {
          ...where,
          messages: {
            some: {
              content: { contains: search, mode: "insensitive" },
            },
          },
        },
      })
      return {
        conversations: conversations.map((c) => ({
          id: c.id,
          chatbotId: c.chatbotId,
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messageCount: c._count.messages,
        })),
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) },
      }
    }

    const [conversations, totalCount] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        chatbotId: c.chatbotId,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  }

  /**
   * Get conversation with message history
   */
  async getConversation(
    conversationId: string,
    chatbotId?: string
  ): Promise<ConversationWithMessages | null> {
    const where: { id: string; chatbotId?: string } = { id: conversationId }
    if (chatbotId) where.chatbotId = chatbotId

    const conv = await prisma.conversation.findFirst({
      where,
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    })
    return conv as ConversationWithMessages | null
  }

  /**
   * Delete conversation and messages
   */
  async deleteConversation(conversationId: string, chatbotId?: string) {
    const where: { id: string; chatbotId?: string } = { id: conversationId }
    if (chatbotId) where.chatbotId = chatbotId
    await prisma.chatMessage.deleteMany({
      where: { conversationId },
    })
    await prisma.conversation.deleteMany({ where })
    return { deleted: true }
  }

  /**
   * Archive: update title or soft-delete (we use delete for cleanup)
   */
  async updateConversationTitle(
    conversationId: string,
    title: string,
    chatbotId?: string
  ) {
    const where: { id: string; chatbotId?: string } = { id: conversationId }
    if (chatbotId) where.chatbotId = chatbotId
    return prisma.conversation.updateMany({
      where,
      data: { title, updatedAt: new Date() },
    })
  }
}
