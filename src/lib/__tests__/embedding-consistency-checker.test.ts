/**
 * Unit tests for EmbeddingConsistencyChecker
 * Tests embedding configuration validation and consistency checking
 */

import { EmbeddingConsistencyChecker } from "../embedding-consistency-checker";
import { EmbeddingConfig } from "../config";

// Mock the config module
jest.mock("../config", () => ({
  getConfig: jest.fn(),
}));

// Mock the prisma client
jest.mock("../../../lib/prisma", () => ({
  prisma: {
    trainingSession: {
      findFirst: jest.fn(),
    },
  },
}));

import { getConfig } from "../config";
import { prisma } from "../../../lib/prisma";

describe("EmbeddingConsistencyChecker", () => {
  let checker: EmbeddingConsistencyChecker;
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    checker = new EmbeddingConsistencyChecker();
    jest.clearAllMocks();
  });

  describe("validateEmbeddingDimensions", () => {
    it("should return true when dimensions match", () => {
      const embedding = new Array(768).fill(0.5);
      const expectedDimensions = 768;

      const result = checker.validateEmbeddingDimensions(
        embedding,
        expectedDimensions,
      );

      expect(result).toBe(true);
    });

    it("should return false when dimensions do not match", () => {
      const embedding = new Array(768).fill(0.5);
      const expectedDimensions = 1536;

      const result = checker.validateEmbeddingDimensions(
        embedding,
        expectedDimensions,
      );

      expect(result).toBe(false);
    });

    it("should handle empty embeddings", () => {
      const embedding: number[] = [];
      const expectedDimensions = 768;

      const result = checker.validateEmbeddingDimensions(
        embedding,
        expectedDimensions,
      );

      expect(result).toBe(false);
    });

    it("should handle zero expected dimensions", () => {
      const embedding = new Array(768).fill(0.5);
      const expectedDimensions = 0;

      const result = checker.validateEmbeddingDimensions(
        embedding,
        expectedDimensions,
      );

      expect(result).toBe(false);
    });
  });

  describe("getCurrentEmbeddingConfig", () => {
    it("should return current embedding config from environment", () => {
      const mockConfig = {
        embedding: {
          provider: "gemini" as const,
          apiKey: "test-key",
          modelName: "text-embedding-004",
          dimensions: 768,
        },
      };

      mockGetConfig.mockReturnValue(mockConfig as any);

      const result = checker.getCurrentEmbeddingConfig();

      expect(result).toEqual(mockConfig.embedding);
      expect(mockGetConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("compareEmbeddingConfigs", () => {
    it("should return match=true when configs are identical", () => {
      const config1: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const config2: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const result = checker.compareEmbeddingConfigs(config1, config2);

      expect(result.match).toBe(true);
      expect(result.differences).toEqual({});
    });

    it("should detect provider mismatch", () => {
      const config1: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const config2: EmbeddingConfig = {
        provider: "local",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const result = checker.compareEmbeddingConfigs(config1, config2);

      expect(result.match).toBe(false);
      expect(result.differences.provider).toEqual({
        expected: "gemini",
        actual: "local",
      });
    });

    it("should detect model name mismatch", () => {
      const config1: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const config2: EmbeddingConfig = {
        provider: "gemini",
        modelName: "embedding-001",
        dimensions: 768,
      };

      const result = checker.compareEmbeddingConfigs(config1, config2);

      expect(result.match).toBe(false);
      expect(result.differences.model).toEqual({
        expected: "text-embedding-004",
        actual: "embedding-001",
      });
    });

    it("should detect dimension mismatch", () => {
      const config1: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const config2: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 1536,
      };

      const result = checker.compareEmbeddingConfigs(config1, config2);

      expect(result.match).toBe(false);
      expect(result.differences.dimensions).toEqual({
        expected: 768,
        actual: 1536,
      });
    });

    it("should detect multiple mismatches", () => {
      const config1: EmbeddingConfig = {
        provider: "gemini",
        modelName: "text-embedding-004",
        dimensions: 768,
      };

      const config2: EmbeddingConfig = {
        provider: "local",
        modelName: "embedding-001",
        dimensions: 1536,
      };

      const result = checker.compareEmbeddingConfigs(config1, config2);

      expect(result.match).toBe(false);
      expect(result.differences.provider).toBeDefined();
      expect(result.differences.model).toBeDefined();
      expect(result.differences.dimensions).toBeDefined();
    });
  });

  describe("getTrainingEmbeddingConfig", () => {
    it("should retrieve training config from database", async () => {
      const mockTrainingSession = {
        chatbotId: "test-chatbot",
        status: "completed",
        config: {
          embeddingProvider: "gemini",
          embeddingModel: "text-embedding-004",
          embeddingDimensions: 768,
        },
        completedAt: new Date(),
      };

      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        mockTrainingSession,
      );

      const result = await checker.getTrainingEmbeddingConfig("test-chatbot");

      expect(result).toEqual({
        provider: "gemini",
        apiKey: undefined,
        endpoint: undefined,
        modelName: "text-embedding-004",
        dimensions: 768,
      });

      expect(mockPrisma.trainingSession.findFirst).toHaveBeenCalledWith({
        where: {
          chatbotId: "test-chatbot",
          status: "completed",
        },
        orderBy: {
          completedAt: "desc",
        },
      });
    });

    it("should return null when no training session found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);

      const result = await checker.getTrainingEmbeddingConfig("test-chatbot");

      expect(result).toBeNull();
    });

    it("should return null when training config has no embedding info", async () => {
      const mockTrainingSession = {
        chatbotId: "test-chatbot",
        status: "completed",
        config: {
          // No embedding info
        },
        completedAt: new Date(),
      };

      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        mockTrainingSession,
      );

      const result = await checker.getTrainingEmbeddingConfig("test-chatbot");

      expect(result).toBeNull();
    });

    it("should use default values when some fields are missing", async () => {
      const mockTrainingSession = {
        chatbotId: "test-chatbot",
        status: "completed",
        config: {
          embeddingProvider: "gemini",
          // Missing embeddingModel and embeddingDimensions
        },
        completedAt: new Date(),
      };

      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        mockTrainingSession,
      );

      const result = await checker.getTrainingEmbeddingConfig("test-chatbot");

      expect(result).toEqual({
        provider: "gemini",
        apiKey: undefined,
        endpoint: undefined,
        modelName: "text-embedding-004", // Default
        dimensions: 768, // Default
      });
    });

    it("should throw error when database query fails", async () => {
      mockPrisma.trainingSession.findFirst.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        checker.getTrainingEmbeddingConfig("test-chatbot"),
      ).rejects.toThrow(
        "Failed to retrieve training embedding config for project test-chatbot",
      );
    });
  });

  describe("validateEmbeddingModel", () => {
    it("should return true when configs match", async () => {
      const mockTrainingSession = {
        chatbotId: "test-chatbot",
        status: "completed",
        config: {
          embeddingProvider: "gemini",
          embeddingModel: "text-embedding-004",
          embeddingDimensions: 768,
        },
        completedAt: new Date(),
      };

      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        mockTrainingSession,
      );

      mockGetConfig.mockReturnValue({
        embedding: {
          provider: "gemini",
          modelName: "text-embedding-004",
          dimensions: 768,
        },
      } as any);

      const result = await checker.validateEmbeddingModel("test-chatbot");

      expect(result).toBe(true);
    });

    it("should return false when configs do not match", async () => {
      const mockTrainingSession = {
        chatbotId: "test-chatbot",
        status: "completed",
        config: {
          embeddingProvider: "gemini",
          embeddingModel: "text-embedding-004",
          embeddingDimensions: 768,
        },
        completedAt: new Date(),
      };

      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        mockTrainingSession,
      );

      mockGetConfig.mockReturnValue({
        embedding: {
          provider: "gemini",
          modelName: "embedding-001", // Different model
          dimensions: 768,
        },
      } as any);

      const result = await checker.validateEmbeddingModel("test-chatbot");

      expect(result).toBe(false);
    });

    it("should return true when no training config found (backward compatibility)", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);

      const result = await checker.validateEmbeddingModel("test-chatbot");

      expect(result).toBe(true);
    });

    it("should throw error when validation fails", async () => {
      mockPrisma.trainingSession.findFirst.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        checker.validateEmbeddingModel("test-chatbot"),
      ).rejects.toThrow(
        "Failed to validate embedding model for project test-chatbot",
      );
    });
  });
});
