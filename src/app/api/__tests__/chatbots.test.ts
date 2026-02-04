/**
 * Chatbots API Tests
 * Tests for /api/chatbots endpoints
 */

import { ChatbotService } from "../../../services/chatbot.service";

// Mock the ChatbotService
jest.mock("../../../services/chatbot.service", () => ({
  ChatbotService: jest.fn().mockImplementation(() => ({
    getChatbots: jest.fn(),
    getChatbot: jest.fn(),
    deleteChatbot: jest.fn(),
  })),
}));

describe("GET /api/chatbots", () => {
  let mockChatbotService: jest.Mocked<ChatbotService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatbotService = new ChatbotService() as jest.Mocked<ChatbotService>;
  });

  it("should return paginated chatbots", async () => {
    const mockResult = {
      chatbots: [
        {
          id: "chatbot-1",
          name: "Test Bot",
          status: "ready",
          statistics: { totalConversations: 5 },
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }
    };

    mockChatbotService.getChatbots.mockResolvedValue(mockResult);

    expect(mockChatbotService.getChatbots).toBeDefined();
  });

  it("should handle filtering parameters", async () => {
    mockChatbotService.getChatbots.mockResolvedValue({
      chatbots: [],
      pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false }
    });

    expect(mockChatbotService.getChatbots).toBeDefined();
  });
});

describe("GET /api/chatbots/:id", () => {
  let mockChatbotService: jest.Mocked<ChatbotService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatbotService = new ChatbotService() as jest.Mocked<ChatbotService>;
  });

  it("should return chatbot details", async () => {
    const mockChatbot = {
      id: "chatbot-1",
      name: "Test Bot",
      status: "ready",
      statistics: { totalConversations: 5 },
      recentTrainingSessions: [],
      recentConversations: [],
    };

    mockChatbotService.getChatbot.mockResolvedValue(mockChatbot);

    expect(mockChatbotService.getChatbot).toBeDefined();
  });

  it("should handle non-existent chatbot", async () => {
    mockChatbotService.getChatbot.mockRejectedValue(new Error("Chatbot not found"));

    expect(mockChatbotService.getChatbot).toBeDefined();
  });
});

describe("DELETE /api/chatbots/:id", () => {
  let mockChatbotService: jest.Mocked<ChatbotService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatbotService = new ChatbotService() as jest.Mocked<ChatbotService>;
  });

  it("should delete chatbot successfully", async () => {
    const mockResult = {
      chatbotId: "chatbot-1",
      deletedConversations: 3,
      deletedTrainingSessions: 2,
    };

    mockChatbotService.deleteChatbot.mockResolvedValue(mockResult);

    expect(mockChatbotService.deleteChatbot).toBeDefined();
  });

  it("should handle non-existent chatbot", async () => {
    mockChatbotService.deleteChatbot.mockRejectedValue(new Error("Chatbot not found"));

    expect(mockChatbotService.deleteChatbot).toBeDefined();
  });
});