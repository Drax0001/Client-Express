/**
 * ChatbotService Tests
 * Tests for chatbot CRUD operations and statistics
 */

import { ChatbotService } from "../chatbot.service";
import { PrismaClient } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    chatbot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
}));

describe("ChatbotService", () => {
  let service: ChatbotService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new ChatbotService(mockPrisma);
  });

  describe("getChatbots", () => {
    it("should return paginated chatbots with statistics", async () => {
      const mockChatbots = [
        {
          id: "chatbot-1",
          name: "Test Bot",
          status: "ready",
          trainingSessions: [{ status: "completed" }],
          conversations: [{ chatMessages: [{}, {}] }],
          _count: { trainingSessions: 1, conversations: 1 },
        }
      ];

      mockPrisma.chatbot.findMany.mockResolvedValue(mockChatbots as any);
      mockPrisma.chatbot.count.mockResolvedValue(1);

      const result = await service.getChatbots({}, 1, 10);

      expect(result.chatbots).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should apply filters correctly", async () => {
      mockPrisma.chatbot.findMany.mockResolvedValue([]);
      mockPrisma.chatbot.count.mockResolvedValue(0);

      await service.getChatbots({ userId: "user-123", status: "ready" });

      expect(mockPrisma.chatbot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-123",
            status: "ready",
          }),
        })
      );
    });
  });

  describe("getChatbot", () => {
    it("should return detailed chatbot information", async () => {
      const mockChatbot = {
        id: "chatbot-1",
        name: "Test Bot",
        status: "ready",
        trainingSessions: [{ status: "completed", _count: { chatMessages: 5 } }],
        conversations: [{ chatMessages: [{ content: "Hello" }] }],
        _count: { trainingSessions: 1, conversations: 1 },
      };

      mockPrisma.chatbot.findUnique.mockResolvedValue(mockChatbot as any);

      const result = await service.getChatbot("chatbot-1");

      expect(result.id).toBe("chatbot-1");
      expect(result.name).toBe("Test Bot");
      expect(result.status).toBe("ready");
      expect(result.statistics).toBeDefined();
    });

    it("should throw error for non-existent chatbot", async () => {
      mockPrisma.chatbot.findUnique.mockResolvedValue(null);

      await expect(service.getChatbot("non-existent")).rejects.toThrow("Chatbot not found");
    });
  });

  describe("deleteChatbot", () => {
    it("should delete chatbot and associated data", async () => {
      const mockChatbot = {
        id: "chatbot-1",
        _count: { trainingSessions: 2, conversations: 3 },
      };

      mockPrisma.chatbot.findUnique.mockResolvedValue(mockChatbot as any);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      const result = await service.deleteChatbot("chatbot-1");

      expect(result.chatbotId).toBe("chatbot-1");
      expect(result.deletedConversations).toBe(3);
      expect(result.deletedTrainingSessions).toBe(2);
    });

    it("should throw error for non-existent chatbot", async () => {
      mockPrisma.chatbot.findUnique.mockResolvedValue(null);

      await expect(service.deleteChatbot("non-existent")).rejects.toThrow("Chatbot not found");
    });
  });

  describe("updateChatbot", () => {
    it("should update chatbot metadata", async () => {
      const updatedChatbot = {
        id: "chatbot-1",
        name: "Updated Bot",
        description: "Updated description",
        updatedAt: new Date(),
      };

      mockPrisma.chatbot.update.mockResolvedValue(updatedChatbot as any);

      const result = await service.updateChatbot("chatbot-1", {
        name: "Updated Bot",
        description: "Updated description",
      });

      expect(result.name).toBe("Updated Bot");
      expect(result.description).toBe("Updated description");
    });
  });

  describe("updateChatbotStats", () => {
    it("should update usage statistics", async () => {
      mockPrisma.chatbot.update.mockResolvedValue({} as any);

      await service.updateChatbotStats("chatbot-1", 150);

      expect(mockPrisma.chatbot.update).toHaveBeenCalledWith({
        where: { id: "chatbot-1" },
        data: {
          lastQueriedAt: expect.any(Date),
          queryCount: { increment: 1 },
          totalTokens: { increment: 150 },
        },
      });
    });
  });
});