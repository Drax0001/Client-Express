/**
 * ChatbotService
 * Service for managing chatbot CRUD operations, statistics, and lifecycle
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { prisma } from "../../lib/prisma";
import { PrismaClient } from "../../generated/prisma/client";
import { ChatbotStatistics, ChatbotFilter } from "@/lib/types";

export class ChatbotService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * Get all chatbots with filtering and pagination
   */
  async getChatbots(filter: ChatbotFilter = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { description: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    // Get chatbots with statistics
    const chatbots = await this.prisma.chatbot.findMany({
      where,
      include: {
        trainingSessions: {
          select: {
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
        conversations: {
          select: {
            createdAt: true,
            chatMessages: {
              select: {
                role: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            trainingSessions: true,
            conversations: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    // Calculate statistics for each chatbot
    const chatbotsWithStats = chatbots.map((chatbot) => ({
      id: chatbot.id,
      userId: chatbot.userId,
      name: chatbot.name,
      description: chatbot.description,
      config: chatbot.config,
      status: chatbot.status,
      documentCount: chatbot.documentCount,
      lastQueriedAt: chatbot.lastQueriedAt,
      queryCount: chatbot.queryCount,
      totalTokens: chatbot.totalTokens,
      createdAt: chatbot.createdAt,
      updatedAt: chatbot.updatedAt,
      statistics: this.calculateChatbotStatistics(chatbot),
    }));

    // Get total count for pagination
    const totalCount = await this.prisma.chatbot.count({ where });

    return {
      chatbots: chatbotsWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get a single chatbot with full details and statistics
   */
  async getChatbot(chatbotId: string) {
    const chatbot = await this.prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        trainingSessions: {
          include: {
            _count: {
              select: {
                chatMessages: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        conversations: {
          include: {
            chatMessages: {
              orderBy: { createdAt: "asc" },
              take: 1, // Just get the first message for preview
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5, // Recent conversations
        },
        _count: {
          select: {
            trainingSessions: true,
            conversations: true,
          },
        },
      },
    });

    if (!chatbot) {
      throw new Error("Chatbot not found");
    }

    return {
      id: chatbot.id,
      userId: chatbot.userId,
      name: chatbot.name,
      description: chatbot.description,
      config: chatbot.config,
      status: chatbot.status,
      documentCount: chatbot.documentCount,
      lastQueriedAt: chatbot.lastQueriedAt,
      queryCount: chatbot.queryCount,
      totalTokens: chatbot.totalTokens,
      createdAt: chatbot.createdAt,
      updatedAt: chatbot.updatedAt,
      statistics: this.calculateDetailedStatistics(chatbot),
      recentTrainingSessions: chatbot.trainingSessions.map((session) => ({
        id: session.id,
        status: session.status,
        messageCount: session._count.chatMessages,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      })),
      recentConversations: chatbot.conversations.map((conversation) => ({
        id: conversation.id,
        firstMessage:
          conversation.chatMessages[0]?.content?.substring(0, 100) || "",
        messageCount: conversation.chatMessages.length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
    };
  }

  /**
   * Delete a chatbot and all associated data
   */
  async deleteChatbot(chatbotId: string) {
    // First get the chatbot to verify it exists and gather cleanup info
    const chatbot = await this.prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        _count: {
          select: {
            trainingSessions: true,
            conversations: true,
          },
        },
      },
    });

    if (!chatbot) {
      throw new Error("Chatbot not found");
    }

    // Delete in transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Delete chat messages first (cascade from conversations)
      await tx.chatMessage.deleteMany({
        where: {
          conversation: {
            chatbotId: chatbotId,
          },
        },
      });

      // Delete conversations
      await tx.conversation.deleteMany({
        where: { chatbotId: chatbotId },
      });

      // Delete training sessions
      await tx.trainingSession.deleteMany({
        where: { chatbotId: chatbotId },
      });

      // Finally delete the chatbot
      await tx.chatbot.delete({
        where: { id: chatbotId },
      });

      return {
        chatbotId,
        deletedConversations: chatbot._count.conversations,
        deletedTrainingSessions: chatbot._count.trainingSessions,
      };
    });

    return result;
  }

  /**
   * Update chatbot metadata
   */
  async updateChatbot(
    chatbotId: string,
    updates: {
      name?: string;
      description?: string;
      config?: any;
    },
  ) {
    const chatbot = await this.prisma.chatbot.update({
      where: { id: chatbotId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        config: true,
        updatedAt: true,
      },
    });

    return chatbot;
  }

  /**
   * Update chatbot usage statistics
   */
  async updateChatbotStats(chatbotId: string, tokensUsed: number) {
    await this.prisma.chatbot.update({
      where: { id: chatbotId },
      data: {
        lastQueriedAt: new Date(),
        queryCount: { increment: 1 },
        totalTokens: { increment: tokensUsed },
      },
    });
  }

  /**
   * Calculate basic statistics for chatbot listing
   */
  private calculateChatbotStatistics(chatbot: any): ChatbotStatistics {
    const completedTrainings = chatbot.trainingSessions.filter(
      (t: any) => t.status === "completed",
    ).length;
    const totalConversations = chatbot._count.conversations;
    const totalMessages = chatbot.conversations.reduce(
      (sum: number, conv: any) => sum + conv.chatMessages.length,
      0,
    );

    return {
      completedTrainings,
      totalConversations,
      totalMessages,
      averageMessagesPerConversation:
        totalConversations > 0 ? totalMessages / totalConversations : 0,
      lastActivity: chatbot.lastQueriedAt,
    };
  }

  /**
   * Calculate detailed statistics for individual chatbot view
   */
  private calculateDetailedStatistics(chatbot: any) {
    const basicStats = this.calculateChatbotStatistics(chatbot);

    // Calculate training history
    const trainingHistory = chatbot.trainingSessions.map((session: any) => ({
      date: session.createdAt,
      status: session.status,
      duration: session.completedAt
        ? session.completedAt.getTime() - session.createdAt.getTime()
        : null,
    }));

    // Calculate conversation patterns
    const conversationsByDay = chatbot.conversations.reduce(
      (acc: any, conv: any) => {
        const day = conv.createdAt.toISOString().split("T")[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      ...basicStats,
      trainingHistory,
      conversationsByDay,
      totalTrainingSessions: chatbot._count.trainingSessions,
      successRate:
        chatbot._count.trainingSessions > 0
          ? (basicStats.completedTrainings / chatbot._count.trainingSessions) *
            100
          : 0,
    };
  }
}
