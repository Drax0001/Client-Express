/**
 * Unit tests for VectorStoreValidator
 *
 * Tests collection status checking, training verification, and debug utilities.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  VectorStoreValidator,
  CollectionStatus,
  ValidationResult,
  SearchTestResult,
  EmbeddingInfo,
} from "../vector-store-validator";
import { VectorStore, SearchResult } from "../vector-store";

// Mock VectorStore
vi.mock("../vector-store");

describe("VectorStoreValidator", () => {
  let validator: VectorStoreValidator;
  let mockVectorStore: VectorStore;

  beforeEach(() => {
    mockVectorStore = new VectorStore();
    validator = new VectorStoreValidator(mockVectorStore);
  });

  describe("validateCollectionExists", () => {
    it("should return true when collection exists", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);

      const result = await validator.validateCollectionExists("test-project");

      expect(result).toBe(true);
      expect(mockVectorStore.collectionExists).toHaveBeenCalledWith(
        "test-project",
      );
    });

    it("should return false when collection does not exist", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(false);

      const result = await validator.validateCollectionExists("test-project");

      expect(result).toBe(false);
    });

    it("should throw VectorStoreError on failure", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockRejectedValue(
        new Error("Connection failed"),
      );

      await expect(
        validator.validateCollectionExists("test-project"),
      ).rejects.toThrow("Failed to validate collection existence");
    });
  });

  describe("getCollectionStatus", () => {
    it("should return status with exists=false when collection does not exist", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(false);

      const status = await validator.getCollectionStatus("test-project");

      expect(status).toEqual({
        exists: false,
        documentCount: 0,
        embeddingDimension: null,
        createdAt: null,
        lastUpdated: null,
      });
    });

    it("should return complete status when collection exists", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "getDocumentCount").mockResolvedValue(42);

      const status = await validator.getCollectionStatus("test-project");

      expect(status.exists).toBe(true);
      expect(status.documentCount).toBe(42);
      expect(status.embeddingDimension).toBe(768); // Default dimension
    });

    it("should throw VectorStoreError on failure", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockRejectedValue(
        new Error("Connection failed"),
      );

      await expect(
        validator.getCollectionStatus("test-project"),
      ).rejects.toThrow("Failed to get collection status");
    });
  });

  describe("verifyTrainingSuccess", () => {
    it("should return success when chunk counts match", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "getDocumentCount").mockResolvedValue(100);

      const result = await validator.verifyTrainingSuccess("test-project", 100);

      expect(result).toEqual({
        success: true,
        actualChunkCount: 100,
        expectedChunkCount: 100,
        discrepancy: 0,
        message: "Training verification successful",
      });
    });

    it("should return failure when collection does not exist", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(false);

      const result = await validator.verifyTrainingSuccess("test-project", 100);

      expect(result).toEqual({
        success: false,
        actualChunkCount: 0,
        expectedChunkCount: 100,
        discrepancy: 100,
        message: "Collection does not exist for project test-project",
      });
    });

    it("should return failure when collection is empty", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "getDocumentCount").mockResolvedValue(0);

      const result = await validator.verifyTrainingSuccess("test-project", 100);

      expect(result).toEqual({
        success: false,
        actualChunkCount: 0,
        expectedChunkCount: 100,
        discrepancy: 100,
        message: "Collection exists but contains no documents",
      });
    });

    it("should return failure when chunk counts mismatch", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "getDocumentCount").mockResolvedValue(80);

      const result = await validator.verifyTrainingSuccess("test-project", 100);

      expect(result).toEqual({
        success: false,
        actualChunkCount: 80,
        expectedChunkCount: 100,
        discrepancy: 20,
        message: "Chunk count mismatch: expected 100, got 80",
      });
    });

    it("should throw VectorStoreError on failure", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockRejectedValue(
        new Error("Connection failed"),
      );

      await expect(
        validator.verifyTrainingSuccess("test-project", 100),
      ).rejects.toThrow("Failed to verify training");
    });
  });

  describe("performTestSearch", () => {
    it("should return success when search returns results", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);

      const mockResults: SearchResult[] = [
        {
          id: "1",
          text: "Test document",
          score: 0.95,
          metadata: {},
        },
        {
          id: "2",
          text: "Another document",
          score: 0.85,
          metadata: {},
        },
      ];

      vi.spyOn(mockVectorStore, "similaritySearch").mockResolvedValue(
        mockResults,
      );

      const testEmbedding = new Array(768).fill(0.1);
      const result = await validator.performTestSearch(
        "test-project",
        testEmbedding,
      );

      expect(result).toEqual({
        success: true,
        resultCount: 2,
        topScore: 0.95,
        error: null,
      });
    });

    it("should return failure when collection does not exist", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(false);

      const testEmbedding = new Array(768).fill(0.1);
      const result = await validator.performTestSearch(
        "test-project",
        testEmbedding,
      );

      expect(result).toEqual({
        success: false,
        resultCount: 0,
        topScore: null,
        error: "Collection does not exist",
      });
    });

    it("should return failure when search returns no results", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "similaritySearch").mockResolvedValue([]);

      const testEmbedding = new Array(768).fill(0.1);
      const result = await validator.performTestSearch(
        "test-project",
        testEmbedding,
      );

      expect(result).toEqual({
        success: false,
        resultCount: 0,
        topScore: null,
        error: "No results returned from test search",
      });
    });

    it("should return failure with error message on exception", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "similaritySearch").mockRejectedValue(
        new Error("Search failed"),
      );

      const testEmbedding = new Array(768).fill(0.1);
      const result = await validator.performTestSearch(
        "test-project",
        testEmbedding,
      );

      expect(result).toEqual({
        success: false,
        resultCount: 0,
        topScore: null,
        error: "Search failed",
      });
    });
  });

  describe("getSampleEmbeddings", () => {
    it("should return empty array when collection does not exist", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(false);

      const result = await validator.getSampleEmbeddings("test-project", 5);

      expect(result).toEqual([]);
    });

    it("should return sample embeddings when collection exists", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);

      const mockResults: SearchResult[] = [
        {
          id: "chunk-1",
          text: "Sample text 1",
          score: 0.9,
          metadata: { source: "doc1.pdf" },
        },
        {
          id: "chunk-2",
          text: "Sample text 2",
          score: 0.8,
          metadata: { source: "doc2.pdf" },
        },
      ];

      vi.spyOn(mockVectorStore, "similaritySearch").mockResolvedValue(
        mockResults,
      );

      const result = await validator.getSampleEmbeddings("test-project", 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "chunk-1",
        dimensions: 768,
        sampleValues: [],
        metadata: { source: "doc1.pdf" },
      });
      expect(result[1]).toEqual({
        id: "chunk-2",
        dimensions: 768,
        sampleValues: [],
        metadata: { source: "doc2.pdf" },
      });
    });

    it("should throw VectorStoreError on failure", async () => {
      vi.spyOn(mockVectorStore, "collectionExists").mockResolvedValue(true);
      vi.spyOn(mockVectorStore, "similaritySearch").mockRejectedValue(
        new Error("Query failed"),
      );

      await expect(
        validator.getSampleEmbeddings("test-project", 5),
      ).rejects.toThrow("Failed to get sample embeddings");
    });
  });
});
