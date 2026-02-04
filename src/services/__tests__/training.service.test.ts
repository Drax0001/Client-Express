/**
 * TrainingService Tests
 * Tests for the TrainingService functionality
 */

import { TrainingService } from "../training.service";
import { createUploadSession } from "../../lib/upload-validation";

// Mock external dependencies
jest.mock("../../lib/prisma", () => ({
  prisma: {
    chatbot: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    trainingSession: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("../../lib/config", () => ({
  getConfig: jest.fn(() => ({
    vectorStore: {
      host: "localhost",
      port: 8000,
    },
  })),
}));

jest.mock("chromadb", () => ({
  ChromaClient: jest.fn(() => ({
    getOrCreateCollection: jest.fn(() => ({
      add: jest.fn(),
    })),
  })),
}));

describe("TrainingService", () => {
  let trainingService: TrainingService;

  beforeEach(() => {
    trainingService = new TrainingService();
    jest.clearAllMocks();
  });

  describe("startTraining", () => {
    it("should start training with valid session", async () => {
      // Mock upload session
      const uploadSession = createUploadSession();
      uploadSession.files = [{
        id: "file1",
        file: {} as File,
        status: "ready",
        validationErrors: [],
        metadata: {
          name: "test.pdf",
          size: 1024,
          type: "application/pdf",
          lastModified: new Date(),
          detectedType: "pdf"
        }
      }];

      // Mock Prisma responses
      const mockPrisma = require("../../lib/prisma").prisma;
      mockPrisma.chatbot.create.mockResolvedValue({
        id: "chatbot-123",
        name: "Test Chatbot",
        status: "training",
      });

      mockPrisma.trainingSession.create.mockResolvedValue({
        id: "training-123",
        chatbotId: "chatbot-123",
        status: "queued",
      });

      const config = {
        chunkSize: 1000,
        chunkOverlap: 200,
        embeddingModel: "gemini",
        temperature: 0.3,
        maxTokens: 1024,
        name: "Test Chatbot",
        description: "A test chatbot"
      };

      const result = await trainingService.startTraining(
        uploadSession.id,
        config,
        "test-user"
      );

      expect(result.trainingId).toBeDefined();
      expect(result.chatbotId).toBeDefined();
      expect(mockPrisma.chatbot.create).toHaveBeenCalled();
      expect(mockPrisma.trainingSession.create).toHaveBeenCalled();
    });

    it("should reject invalid upload session", async () => {
      const config = {
        chunkSize: 1000,
        chunkOverlap: 200,
        embeddingModel: "gemini",
        temperature: 0.3,
        maxTokens: 1024,
        name: "Test Chatbot"
      };

      await expect(
        trainingService.startTraining("invalid-session", config)
      ).rejects.toThrow("Upload session not found or expired");
    });
  });

  describe("getTrainingProgress", () => {
    it("should return training progress", async () => {
      const mockPrisma = require("../../lib/prisma").prisma;
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "training-123",
        progress: {
          status: "processing",
          currentStep: "embedding",
          progress: 75,
          errors: [],
          startedAt: new Date(),
        },
        config: {
          chunkSize: 1000,
          chunkOverlap: 200,
        }
      });

      const progress = await trainingService.getTrainingProgress("training-123");

      expect(progress.status).toBe("processing");
      expect(progress.currentStep).toBe("embedding");
      expect(progress.progress).toBe(75);
    });

    it("should reject non-existent training session", async () => {
      const mockPrisma = require("../../lib/prisma").prisma;
      mockPrisma.trainingSession.findUnique.mockResolvedValue(null);

      await expect(
        trainingService.getTrainingProgress("non-existent")
      ).rejects.toThrow("Training session not found");
    });
  });

  describe("cancelTraining", () => {
    it("should cancel active training", async () => {
      const mockPrisma = require("../../lib/prisma").prisma;
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "training-123",
        chatbotId: "chatbot-123",
        status: "processing",
        progress: { status: "processing" }
      });

      mockPrisma.trainingSession.update.mockResolvedValue({
        progress: { status: "cancelled" }
      });

      const result = await trainingService.cancelTraining("training-123");

      expect(result.status).toBe("cancelled");
      expect(mockPrisma.trainingSession.update).toHaveBeenCalled();
      expect(mockPrisma.chatbot.update).toHaveBeenCalled();
    });

    it("should reject cancelling completed training", async () => {
      const mockPrisma = require("../../lib/prisma").prisma;
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "training-123",
        status: "completed"
      });

      await expect(
        trainingService.cancelTraining("training-123")
      ).rejects.toThrow("Cannot cancel completed or failed training");
    });
  });

  describe("estimateTrainingTime", () => {
    it("should estimate reasonable training time", () => {
      const config = {
        chunkSize: 1000,
        chunkOverlap: 200,
        embeddingModel: "gemini",
        temperature: 0.3,
        maxTokens: 1024,
        name: "Test"
      };

      // Access private method for testing
      const estimateMethod = (trainingService as any).estimateTrainingTime.bind(trainingService);
      const estimatedTime = estimateMethod(config, 5, 2 * 1024 * 1024); // 5 docs, 2MB

      expect(estimatedTime).toBeGreaterThan(30000); // At least 30 seconds
      expect(estimatedTime).toBeLessThan(300000); // Less than 5 minutes
    });
  });
});