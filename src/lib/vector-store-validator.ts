/**
 * Vector Store Validator Module
 *
 * Validates the state of the vector store before and after operations.
 * Provides collection status checking, post-training verification, and debug utilities.
 *
 * Requirements: 2.1, 2.3, 2.5, 2.6
 */

import { VectorStore } from "./vector-store";
import { VectorStoreError } from "./errors";

/**
 * Collection status information
 */
export interface CollectionStatus {
  exists: boolean;
  documentCount: number;
  embeddingDimension: number | null;
  createdAt: Date | null;
  lastUpdated: Date | null;
}

/**
 * Validation result for post-training verification
 */
export interface ValidationResult {
  success: boolean;
  actualChunkCount: number;
  expectedChunkCount: number;
  discrepancy: number;
  message: string;
}

/**
 * Search test result for verifying collection queryability
 */
export interface SearchTestResult {
  success: boolean;
  resultCount: number;
  topScore: number | null;
  error: string | null;
}

/**
 * Embedding information for debugging
 */
export interface EmbeddingInfo {
  id: string;
  dimensions: number;
  sampleValues: number[]; // First 10 values
  metadata: Record<string, any>;
}

/**
 * VectorStoreValidator class
 * Validates vector store state and provides debugging utilities
 */
export class VectorStoreValidator {
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * Validates that a collection exists for a project
   * Requirement 2.3: Verify collection exists before performing similarity search
   *
   * @param projectId - The project identifier
   * @returns Promise that resolves to true if collection exists
   */
  async validateCollectionExists(projectId: string): Promise<boolean> {
    try {
      return await this.vectorStore.collectionExists(projectId);
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to validate collection existence for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Gets comprehensive status information about a collection
   * Requirement 2.5: Provide API endpoint to check collection status
   * Requirement 2.6: Log collection metadata including creation time and document count
   *
   * @param projectId - The project identifier
   * @returns Promise that resolves to collection status
   */
  async getCollectionStatus(projectId: string): Promise<CollectionStatus> {
    try {
      const exists = await this.vectorStore.collectionExists(projectId);

      if (!exists) {
        return {
          exists: false,
          documentCount: 0,
          embeddingDimension: null,
          createdAt: null,
          lastUpdated: null,
        };
      }

      const documentCount = await this.vectorStore.getDocumentCount(projectId);

      // Get collection metadata from ChromaDB
      const metadata = await this.getCollectionMetadata(projectId);

      return {
        exists: true,
        documentCount,
        embeddingDimension: metadata.embeddingDimension,
        createdAt: metadata.createdAt,
        lastUpdated: metadata.lastUpdated,
      };
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to get collection status for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Verifies that training completed successfully
   * Requirement 2.1: Verify embeddings were successfully stored in ChromaDB
   * Requirement 2.2: Log total number of chunks stored
   *
   * @param projectId - The project identifier
   * @param expectedChunkCount - Expected number of chunks from training
   * @returns Promise that resolves to validation result
   */
  async verifyTrainingSuccess(
    projectId: string,
    expectedChunkCount: number,
  ): Promise<ValidationResult> {
    try {
      const exists = await this.vectorStore.collectionExists(projectId);

      if (!exists) {
        return {
          success: false,
          actualChunkCount: 0,
          expectedChunkCount,
          discrepancy: expectedChunkCount,
          message: `Collection does not exist for project ${projectId}`,
        };
      }

      const actualChunkCount =
        await this.vectorStore.getDocumentCount(projectId);
      const discrepancy = Math.abs(actualChunkCount - expectedChunkCount);

      if (actualChunkCount === 0) {
        return {
          success: false,
          actualChunkCount: 0,
          expectedChunkCount,
          discrepancy: expectedChunkCount,
          message: "Collection exists but contains no documents",
        };
      }

      if (actualChunkCount !== expectedChunkCount) {
        return {
          success: false,
          actualChunkCount,
          expectedChunkCount,
          discrepancy,
          message: `Chunk count mismatch: expected ${expectedChunkCount}, got ${actualChunkCount}`,
        };
      }

      return {
        success: true,
        actualChunkCount,
        expectedChunkCount,
        discrepancy: 0,
        message: "Training verification successful",
      };
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to verify training for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Performs a test similarity search to verify collection is queryable
   *
   * @param projectId - The project identifier
   * @param testQuery - Test query embedding
   * @returns Promise that resolves to search test result
   */
  async performTestSearch(
    projectId: string,
    testQuery: number[],
  ): Promise<SearchTestResult> {
    try {
      const exists = await this.vectorStore.collectionExists(projectId);

      if (!exists) {
        return {
          success: false,
          resultCount: 0,
          topScore: null,
          error: "Collection does not exist",
        };
      }

      const results = await this.vectorStore.similaritySearch(
        projectId,
        testQuery,
        5,
      );

      if (results.length === 0) {
        return {
          success: false,
          resultCount: 0,
          topScore: null,
          error: "No results returned from test search",
        };
      }

      return {
        success: true,
        resultCount: results.length,
        topScore: results[0].score,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        resultCount: 0,
        topScore: null,
        error: error.message,
      };
    }
  }

  /**
   * Gets sample embeddings from a collection for debugging
   * Requirement 2.5: Provide debug endpoint with sample embeddings
   *
   * @param projectId - The project identifier
   * @param count - Number of sample embeddings to retrieve
   * @returns Promise that resolves to array of embedding info
   */
  async getSampleEmbeddings(
    projectId: string,
    count: number = 5,
  ): Promise<EmbeddingInfo[]> {
    try {
      const exists = await this.vectorStore.collectionExists(projectId);

      if (!exists) {
        return [];
      }

      // Create a dummy query embedding to get sample results
      // We'll use a zero vector which will return arbitrary samples
      const dummyEmbedding = new Array(768).fill(0);

      const results = await this.vectorStore.similaritySearch(
        projectId,
        dummyEmbedding,
        count,
      );

      // Transform results into EmbeddingInfo format
      // Note: We can't get the actual embedding vectors from ChromaDB query results
      // This is a limitation of the ChromaDB API - it doesn't return embeddings in query results
      return results.map((result) => ({
        id: result.id,
        dimensions: 768, // Default dimension, would need to be stored in metadata
        sampleValues: [], // Cannot retrieve actual embeddings from query results
        metadata: result.metadata || {},
      }));
    } catch (error: any) {
      throw new VectorStoreError(
        `Failed to get sample embeddings for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Gets collection metadata from ChromaDB
   * Private helper method to retrieve metadata
   *
   * @param projectId - The project identifier
   * @returns Promise that resolves to metadata object
   */
  private async getCollectionMetadata(projectId: string): Promise<{
    embeddingDimension: number | null;
    createdAt: Date | null;
    lastUpdated: Date | null;
  }> {
    try {
      // Access the private client through the vector store
      // This is a workaround since VectorStore doesn't expose collection metadata directly
      // In a production system, we'd add a method to VectorStore to get metadata

      // For now, return default values
      // TODO: Enhance VectorStore to expose collection metadata
      return {
        embeddingDimension: 768, // Default Gemini embedding dimension
        createdAt: null,
        lastUpdated: null,
      };
    } catch (error: any) {
      return {
        embeddingDimension: null,
        createdAt: null,
        lastUpdated: null,
      };
    }
  }
}
