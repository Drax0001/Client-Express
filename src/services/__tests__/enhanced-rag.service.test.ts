/**
 * Enhanced RAG Service Tests
 *
 * Tests for the enhanced RAG service with validation and logging
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 3.5
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnhancedRagService } from "../enhanced-rag.service";
import { RagLogger, IdkReason } from "../../lib/rag-logger";
import { VectorStore } from "../../lib/vector-store";
import { EmbeddingService } from "../../lib/embedding-service";
import { LLMService } from "../../lib/llm-service";
import { ProjectService } from "../project.service";
import { ValidationError } from "../../lib/errors";

// Mock the prisma client
vi.mock("../../../lib/prisma", () => ({
  prisma: {
    chatbot: {
      findUnique: vi.fn(),
    },
    trainingSession: {
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn().mockResolvedValue({
        id: "test-project",
        name: "Test Project",
      }),
    },
  },
}));

describe("EnhancedRagService", () => {
  let service: EnhancedRagService;
  let mockLogger: RagLogger;
  let mockVectorStore: VectorStore;
  let mockEmbeddingService: EmbeddingService;

  beforeEach(() => {
    // Create mock logger
    mockLogger = new RagLogger("debug", false, false);
    vi.spyOn(mockLogger, "logQueryStart");
    vi.spyOn(mockLogger, "logEmbeddingGeneration");
    vi.spyOn(mockLogger, "logSimilaritySearch");
    vi.spyOn(mockLogger, "logThresholdCheck");
    vi.spyOn(mockLogger, "logCollectionStatus");
    vi.spyOn(mockLogger, "logIdkResponse");

    // Create mock vector store
    mockVectorStore = {
      collectionExists: vi.fn(),
      getDocumentCount: vi.fn(),
      similaritySearch: vi.fn(),
    } as any;

    // Create mock embedding service
    mockEmbeddingService = {
      generateEmbedding: vi.fn(),
    } as any;

    // Create service with mocks
    service = new EnhancedRagService(
      mockLogger,
      mockVectorStore,
      mockEmbeddingService,
    );

    // Mock LLM service
    vi.spyOn(LLMService.prototype, "generateResponse").mockResolvedValue(
      "Test answer",
    );

    // Mock Project service
    vi.spyOn(ProjectService.prototype, "getProject").mockResolvedValue({
      id: "test-project",
      name: "Test Project",
    } as any);
  });

  describe("chat - validation", () => {
    it("should validate required projectId field", async () => {
      await expect(
        service.chat({
          projectId: "",
          message: "test",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should validate required message field", async () => {
      await expect(
        service.chat({
          projectId: "test-project",
          message: "",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("chat - logging requirements", () => {
    beforeEach(() => {
      // Setup successful mocks for logging tests
      (mockVectorStore.collectionExists as any).mockResolvedValue(true);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(10);

      const mockEmbedding = new Array(768).fill(0.1);
      (mockEmbeddingService.generateEmbedding as any).mockResolvedValue(
        mockEmbedding,
      );

      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.8,
          text: "Test document content",
          metadata: {},
        },
      ]);
    });

    it("should log query start with projectId and query text (Requirement 1.1)", async () => {
      await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(mockLogger.logQueryStart).toHaveBeenCalled();
      const logCall = (mockLogger.logQueryStart as any).mock.calls[0];
      expect(logCall[0].projectId).toBe("test-project");
      expect(logCall[1]).toBe("test query");
    });

    it("should log embedding generation with dimensions and sample values (Requirement 1.2)", async () => {
      await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(mockLogger.logEmbeddingGeneration).toHaveBeenCalled();
      const logCall = (mockLogger.logEmbeddingGeneration as any).mock.calls[0];
      expect(logCall[1]).toBe(768); // dimensions
      expect(Array.isArray(logCall[2])).toBe(true); // sample values
      expect(logCall[2].length).toBeGreaterThan(0);
    });

    it("should log similarity search with result count and scores (Requirement 1.3)", async () => {
      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.8,
          text: "Test document content",
          metadata: {},
        },
        {
          id: "doc2",
          score: 0.7,
          text: "Another document",
          metadata: {},
        },
      ]);

      await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(mockLogger.logSimilaritySearch).toHaveBeenCalled();
      const logCall = (mockLogger.logSimilaritySearch as any).mock.calls[0];
      expect(logCall[1]).toBe(2); // result count
      expect(logCall[2]).toEqual([0.8, 0.7]); // scores
    });

    it("should log threshold check with highest score and threshold (Requirement 1.4)", async () => {
      await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(mockLogger.logThresholdCheck).toHaveBeenCalled();
      const logCall = (mockLogger.logThresholdCheck as any).mock.calls[0];
      expect(logCall[1]).toBe(0.8); // highest score
      expect(typeof logCall[2]).toBe("number"); // threshold
      expect(typeof logCall[3]).toBe("boolean"); // passed
    });

    it("should log collection status before query (Requirement 2.3)", async () => {
      await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(mockLogger.logCollectionStatus).toHaveBeenCalled();
      const logCall = (mockLogger.logCollectionStatus as any).mock.calls[0];
      expect(logCall[1]).toBe(true); // exists
      expect(logCall[2]).toBe(10); // document count
    });
  });

  describe("chat - error handling", () => {
    it("should return error when collection does not exist", async () => {
      (mockVectorStore.collectionExists as any).mockResolvedValue(false);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(0);

      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe("NO_COLLECTION");
      expect(response.error?.userMessage).toContain("No documents");
    });

    it("should return error when collection is empty", async () => {
      (mockVectorStore.collectionExists as any).mockResolvedValue(true);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(0);

      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe("EMPTY_COLLECTION");
      expect(response.error?.userMessage).toContain("empty");
    });
  });

  describe("chat - threshold filtering", () => {
    beforeEach(() => {
      (mockVectorStore.collectionExists as any).mockResolvedValue(true);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(10);

      const mockEmbedding = new Array(768).fill(0.1);
      (mockEmbeddingService.generateEmbedding as any).mockResolvedValue(
        mockEmbedding,
      );
    });

    it("should return 'I don't know' when threshold not met", async () => {
      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.2, // Below default threshold of 0.4
          text: "Test document content",
          metadata: {},
        },
      ]);

      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(response.success).toBe(true);
      expect(response.answer).toBe("I don't know");
      expect(response.sourceCount).toBe(0);
      expect(mockLogger.logIdkResponse).toHaveBeenCalledWith(
        expect.anything(),
        IdkReason.THRESHOLD_NOT_MET,
        expect.anything(),
      );
    });

    it("should bypass threshold when forceAnswer is true", async () => {
      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.2, // Below threshold
          text: "Test document content",
          metadata: {},
        },
      ]);

      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
        forceAnswer: true,
      });

      expect(response.success).toBe(true);
      expect(response.answer).toBe("Test answer");
      expect(response.sourceCount).toBeGreaterThan(0);
    });
  });

  describe("chat - debug mode", () => {
    beforeEach(() => {
      (mockVectorStore.collectionExists as any).mockResolvedValue(true);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(10);

      const mockEmbedding = new Array(768).fill(0.1);
      (mockEmbeddingService.generateEmbedding as any).mockResolvedValue(
        mockEmbedding,
      );

      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.8,
          text: "Test document content",
          metadata: {},
        },
      ]);
    });

    it("should include debug info when debugMode is enabled", async () => {
      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
        debugMode: true,
      });

      expect(response.debugInfo).toBeDefined();
      expect(response.debugInfo?.requestId).toBeDefined();
      expect(response.debugInfo?.collectionStatus).toBeDefined();
      expect(response.debugInfo?.embeddingDimensions).toBe(768);
      expect(response.debugInfo?.searchResults).toBeDefined();
      expect(response.debugInfo?.thresholdCheck).toBeDefined();
      expect(response.debugInfo?.processingTimeMs).toBeGreaterThan(0);
    });

    it("should not include debug info when debugMode is disabled", async () => {
      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
        debugMode: false,
      });

      expect(response.debugInfo).toBeUndefined();
    });
  });

  describe("chat - retry logic", () => {
    beforeEach(() => {
      (mockVectorStore.collectionExists as any).mockResolvedValue(true);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(10);

      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.8,
          text: "Test document content",
          metadata: {},
        },
      ]);
    });

    it("should retry embedding generation on failure", async () => {
      const mockEmbedding = new Array(768).fill(0.1);

      // Fail first, succeed second
      (mockEmbeddingService.generateEmbedding as any)
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce(mockEmbedding);

      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(response.success).toBe(true);
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledTimes(2);
    });
  });

  describe("chat - successful flow", () => {
    beforeEach(() => {
      (mockVectorStore.collectionExists as any).mockResolvedValue(true);
      (mockVectorStore.getDocumentCount as any).mockResolvedValue(10);

      const mockEmbedding = new Array(768).fill(0.1);
      (mockEmbeddingService.generateEmbedding as any).mockResolvedValue(
        mockEmbedding,
      );

      (mockVectorStore.similaritySearch as any).mockResolvedValue([
        {
          id: "doc1",
          score: 0.8,
          text: "Test document content",
          metadata: {},
        },
      ]);
    });

    it("should return successful response with answer and source count", async () => {
      const response = await service.chat({
        projectId: "test-project",
        message: "test query",
      });

      expect(response.success).toBe(true);
      expect(response.answer).toBe("Test answer");
      expect(response.sourceCount).toBeGreaterThan(0);
      expect(response.error).toBeUndefined();
    });
  });
});
