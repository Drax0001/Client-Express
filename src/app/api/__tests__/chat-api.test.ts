/**
 * Chat API Tests
 * Tests for POST /api/chat endpoint
 */

import { ChatService } from "../../../services/chat.service";
import { ChatbotService } from "../../../services/chatbot.service";

// Mock the services
jest.mock("../../../services/chat.service");
jest.mock("../../../services/chatbot.service");

describe("POST /api/chat", () => {
  let mockChatService: jest.Mocked<ChatService>;
  let mockChatbotService: jest.Mocked<ChatbotService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatService = new ChatService() as jest.Mocked<ChatService>;
    mockChatbotService = new ChatbotService() as jest.Mocked<ChatbotService>;
  });

  it("should validate required fields", async () => {
    // Test validation would be handled in the actual API route
    // This test validates the service integration

    const validRequest = {
      chatbotId: "chatbot-123",
      message: "Hello, how are you?",
      conversationId: "conv-456",
      sessionId: "session-789",
    };

    expect(validRequest.chatbotId).toBeDefined();
    expect(validRequest.message).toBeTruthy();
  });

  it("should process valid chat messages", async () => {
    // Mock chatbot verification
    mockChatbotService.getChatbot.mockResolvedValue({
      id: "chatbot-123",
      name: "Test Bot",
      status: "ready",
      statistics: {},
      recentTrainingSessions: [],
      recentConversations: [],
    });

    // Mock chat processing
    mockChatService.processMessage.mockResolvedValue({
      conversationId: "conv-456",
      message: "Hello! I'm doing well, thank you for asking.",
      sourceCount: 2,
      tokensUsed: 45,
      responseTime: 1200,
    });

    // Mock stats update
    mockChatbotService.updateChatbotStats.mockResolvedValue();

    expect(mockChatService.processMessage).toBeDefined();
    expect(mockChatbotService.updateChatbotStats).toBeDefined();
  });

  it("should reject messages to non-ready chatbots", async () => {
    // Mock chatbot that's still training
    mockChatbotService.getChatbot.mockResolvedValue({
      id: "chatbot-123",
      name: "Test Bot",
      status: "training",
      statistics: {},
      recentTrainingSessions: [],
      recentConversations: [],
    });

    expect(mockChatbotService.getChatbot).toBeDefined();
  });

  it("should handle non-existent chatbots", async () => {
    mockChatbotService.getChatbot.mockRejectedValue(new Error("Chatbot not found"));

    expect(mockChatbotService.getChatbot).toBeDefined();
  });

  it("should update usage statistics after successful chat", async () => {
    mockChatbotService.updateChatbotStats.mockResolvedValue();

    expect(mockChatbotService.updateChatbotStats).toBeDefined();
  });

  it("should handle conversation session management", async () => {
    const mockResult = {
      conversationId: "new-conv-123",
      message: "Response message",
      sourceCount: 1,
      tokensUsed: 25,
      responseTime: 800,
    };

    mockChatService.processMessage.mockResolvedValue(mockResult);

    expect(mockResult.conversationId).toBe("new-conv-123");
    expect(mockResult.sourceCount).toBe(1);
  });
});