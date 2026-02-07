/**
 * TrainingVerificationService - Verifies training completion and collection integrity
 *
 * This service validates that training operations completed successfully by:
 * - Verifying embeddings were stored in ChromaDB
 * - Performing test searches to ensure collections are queryable
 * - Detecting discrepancies between expected and actual chunk counts
 * - Persisting verification metadata for auditing
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { prisma } from "../../lib/prisma";
import { getConfig } from "../lib/config";
import { EmbeddingService } from "../lib/embedding-service";
import { VectorStoreValidator } from "../lib/vector-store-validator";
import { VectorStore } from "../lib/vector-store";
import { RagLogger } from "../lib/rag-logger";

/**
 * Embedding configuration used during training
 */
export interface EmbeddingConfig {
  provider: "gemini" | "openai" | "cohere";
  model: string;
  dimensions: number;
}

/**
 * Details about verification results
 */
export interface VerificationDetails {
  verifiedAt: Date;
  collectionExists: boolean;
  actualChunkCount: number;
  testSearchSuccessful: boolean;
  testSearchScore: number | null;
}

/**
 * Training metadata with verification status
 */
export interface TrainingMetadata {
  chatbotId: string;
  chunkCount: number;
  embeddingConfig: EmbeddingConfig;
  trainedAt: Date;
  verified: boolean;
  verificationDetails: VerificationDetails | null;
}

/**
 * Discrepancy report for training verification
 */
export interface DiscrepancyReport {
  hasDiscrepancies: boolean;
  issues: {
    type:
      | "missing_collection"
      | "chunk_count_mismatch"
      | "embedding_dimension_mismatch"
      | "test_search_failed";
    expected: any;
    actual: any;
    severity: "critical" | "warning";
  }[];
  recommendations: string[];
}

/**
 * TrainingVerificationService class
 * Handles post-training verification and integrity checks
 */
export class TrainingVerificationService {
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService;
  private vectorStoreValidator: VectorStoreValidator;
  private logger: RagLogger;
  private config = getConfig();

  constructor() {
    this.vectorStore = new VectorStore();
    this.embeddingService = new EmbeddingService();
    this.vectorStoreValidator = new VectorStoreValidator(this.vectorStore);
    this.logger = new RagLogger();
  }

  /**
   * Verifies training completion for a chatbot
   *
   * This method performs comprehensive verification after training:
   * 1. Checks if the collection exists in ChromaDB
   * 2. Verifies the actual chunk count matches expected count
   * 3. Performs a test search to ensure the collection is queryable
   * 4. Stores verification results in the database
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4
   *
   * @param chatbotId - The chatbot identifier
   * @param expectedChunkCount - Expected number of chunks from training
   * @returns Training metadata with verification details
   */
  async verifyTrainingCompletion(
    chatbotId: string,
    expectedChunkCount: number,
  ): Promise<TrainingMetadata> {
    const requestId = this.generateRequestId();
    const context = {
      requestId,
      projectId: chatbotId,
      stage: "validation" as const,
      timestamp: new Date(),
    };

    this.logger.info(context, "Starting training verification", {
      chatbotId,
      expectedChunkCount,
    });

    try {
      // Check if collection exists
      const collectionStatus =
        await this.vectorStoreValidator.getCollectionStatus(chatbotId);

      if (!collectionStatus.exists) {
        this.logger.logError(
          context,
          new Error("Collection does not exist after training"),
          "training_verification",
        );

        // Mark training as failed if collection doesn't exist
        await this.updateChatbotStatus(chatbotId, "failed");

        return {
          chatbotId,
          chunkCount: 0,
          embeddingConfig: await this.getCurrentEmbeddingConfig(),
          trainedAt: new Date(),
          verified: false,
          verificationDetails: {
            verifiedAt: new Date(),
            collectionExists: false,
            actualChunkCount: 0,
            testSearchSuccessful: false,
            testSearchScore: null,
          },
        };
      }

      // Get actual chunk count
      const actualChunkCount = collectionStatus.documentCount;

      this.logger.info(context, "Collection status retrieved", {
        exists: collectionStatus.exists,
        actualChunkCount,
        expectedChunkCount,
      });

      // Requirement 7.3: Mark training as failed if collection is empty
      if (actualChunkCount === 0) {
        this.logger.logError(
          context,
          new Error("Collection is empty after training"),
          "training_verification",
        );

        await this.updateChatbotStatus(chatbotId, "failed");

        return {
          chatbotId,
          chunkCount: 0,
          embeddingConfig: await this.getCurrentEmbeddingConfig(),
          trainedAt: new Date(),
          verified: false,
          verificationDetails: {
            verifiedAt: new Date(),
            collectionExists: true,
            actualChunkCount: 0,
            testSearchSuccessful: false,
            testSearchScore: null,
          },
        };
      }

      // Requirement 7.2: Perform test search to verify collection is queryable
      const testSearchResult = await this.performTestSearch(chatbotId);

      this.logger.info(context, "Test search completed", {
        success: testSearchResult.success,
        resultCount: testSearchResult.resultCount,
        topScore: testSearchResult.topScore,
      });

      // Requirement 7.6: Log chunk count discrepancies
      if (actualChunkCount !== expectedChunkCount) {
        this.logger.warn(context, "Chunk count discrepancy detected", {
          expected: expectedChunkCount,
          actual: actualChunkCount,
          difference: actualChunkCount - expectedChunkCount,
        });
      }

      // Create training metadata
      const metadata: TrainingMetadata = {
        chatbotId,
        chunkCount: actualChunkCount,
        embeddingConfig: await this.getCurrentEmbeddingConfig(),
        trainedAt: new Date(),
        verified: testSearchResult.success && actualChunkCount > 0,
        verificationDetails: {
          verifiedAt: new Date(),
          collectionExists: true,
          actualChunkCount,
          testSearchSuccessful: testSearchResult.success,
          testSearchScore: testSearchResult.topScore,
        },
      };

      // Requirement 7.4: Store training metadata
      await this.storeTrainingMetadata(metadata);

      this.logger.info(context, "Training verification completed", {
        verified: metadata.verified,
        chunkCount: actualChunkCount,
      });

      return metadata;
    } catch (error) {
      this.logger.logError(context, error as Error, "training_verification");
      throw error;
    }
  }

  /**
   * Performs a test similarity search to verify collection is queryable
   *
   * This method generates a test query embedding and performs a search
   * to ensure the collection can be queried successfully.
   *
   * Requirements: 7.2
   *
   * @param chatbotId - The chatbot identifier
   * @returns Test search result with success status and top score
   */
  async performTestSearch(chatbotId: string): Promise<{
    success: boolean;
    resultCount: number;
    topScore: number | null;
    error: string | null;
  }> {
    try {
      // Generate a test query embedding
      const testQuery = "test query for verification";
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(testQuery);

      // Perform similarity search
      const collection = await this.chromaClient.getCollection({
        name: chatbotId,
      });

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5,
        include: ["documents", "distances"],
      });

      const resultCount = results.ids?.[0]?.length || 0;
      const topScore =
        resultCount > 0 && results.distances?.[0]?.[0] !== undefined
          ? 1 - results.distances[0][0] // Convert distance to similarity
          : null;

      return {
        success: resultCount > 0,
        resultCount,
        topScore,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        resultCount: 0,
        topScore: null,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Stores training metadata in the database
   *
   * This method persists verification results and training metadata
   * for auditing and debugging purposes.
   *
   * Requirements: 7.4
   *
   * @param metadata - Training metadata to store
   */
  async storeTrainingMetadata(metadata: TrainingMetadata): Promise<void> {
    try {
      // Update chatbot with verification metadata
      await prisma.chatbot.update({
        where: { id: metadata.chatbotId },
        data: {
          config: {
            ...(await this.getChatbotConfig(metadata.chatbotId)),
            embeddingProvider: metadata.embeddingConfig.provider,
            embeddingModel: metadata.embeddingConfig.model,
            embeddingDimensions: metadata.embeddingConfig.dimensions,
            chunkCount: metadata.chunkCount,
            verified: metadata.verified,
            verifiedAt: metadata.verificationDetails?.verifiedAt,
            verificationPassed: metadata.verified,
            verificationDetails: metadata.verificationDetails,
          } as any,
        },
      });
    } catch (error) {
      console.error("Failed to store training metadata:", error);
      throw error;
    }
  }

  /**
   * Detects discrepancies in training results
   *
   * This method analyzes the training results and identifies issues such as:
   * - Missing collections
   * - Chunk count mismatches
   * - Failed test searches
   *
   * Requirements: 7.6
   *
   * @param chatbotId - The chatbot identifier
   * @returns Discrepancy report with issues and recommendations
   */
  async detectDiscrepancies(chatbotId: string): Promise<DiscrepancyReport> {
    const report: DiscrepancyReport = {
      hasDiscrepancies: false,
      issues: [],
      recommendations: [],
    };

    try {
      // Get chatbot metadata
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
      });

      if (!chatbot) {
        report.hasDiscrepancies = true;
        report.issues.push({
          type: "missing_collection",
          expected: "Chatbot exists",
          actual: "Chatbot not found",
          severity: "critical",
        });
        report.recommendations.push("Verify the chatbot ID is correct");
        return report;
      }

      // Check collection existence
      const collectionStatus =
        await this.vectorStoreValidator.getCollectionStatus(chatbotId);

      if (!collectionStatus.exists) {
        report.hasDiscrepancies = true;
        report.issues.push({
          type: "missing_collection",
          expected: "Collection exists",
          actual: "Collection not found",
          severity: "critical",
        });
        report.recommendations.push(
          "Re-train the chatbot to create the collection",
        );
      }

      // Check chunk count
      const config = chatbot.config as any;
      const expectedChunkCount = config?.chunkCount || 0;
      const actualChunkCount = collectionStatus.documentCount;

      if (expectedChunkCount > 0 && actualChunkCount !== expectedChunkCount) {
        report.hasDiscrepancies = true;
        report.issues.push({
          type: "chunk_count_mismatch",
          expected: expectedChunkCount,
          actual: actualChunkCount,
          severity: actualChunkCount === 0 ? "critical" : "warning",
        });

        if (actualChunkCount === 0) {
          report.recommendations.push(
            "Re-train the chatbot as no chunks were stored",
          );
        } else {
          report.recommendations.push(
            "Chunk count mismatch detected. This may indicate partial training failure.",
          );
        }
      }

      // Check embedding dimensions
      const expectedDimensions = config?.embeddingDimensions;
      const actualDimensions = collectionStatus.embeddingDimension;

      if (
        expectedDimensions &&
        actualDimensions &&
        expectedDimensions !== actualDimensions
      ) {
        report.hasDiscrepancies = true;
        report.issues.push({
          type: "embedding_dimension_mismatch",
          expected: expectedDimensions,
          actual: actualDimensions,
          severity: "critical",
        });
        report.recommendations.push(
          "Embedding dimension mismatch. Re-train with consistent embedding configuration.",
        );
      }

      // Perform test search
      if (collectionStatus.exists && actualChunkCount > 0) {
        const testSearchResult = await this.performTestSearch(chatbotId);

        if (!testSearchResult.success) {
          report.hasDiscrepancies = true;
          report.issues.push({
            type: "test_search_failed",
            expected: "Test search succeeds",
            actual: testSearchResult.error || "Test search failed",
            severity: "critical",
          });
          report.recommendations.push(
            "Collection exists but test search failed. Check ChromaDB connectivity.",
          );
        }
      }

      return report;
    } catch (error) {
      report.hasDiscrepancies = true;
      report.issues.push({
        type: "missing_collection",
        expected: "Verification succeeds",
        actual: (error as Error).message,
        severity: "critical",
      });
      report.recommendations.push(
        "An error occurred during verification. Check logs for details.",
      );
      return report;
    }
  }

  /**
   * Re-verifies training for a chatbot
   *
   * This method allows manual re-verification of training status,
   * useful for debugging or after fixing issues.
   *
   * Requirements: 7.5
   *
   * @param chatbotId - The chatbot identifier
   * @returns Updated training metadata
   */
  async reverifyTraining(chatbotId: string): Promise<TrainingMetadata> {
    const requestId = this.generateRequestId();
    const context = {
      requestId,
      projectId: chatbotId,
      stage: "validation" as const,
      timestamp: new Date(),
    };

    this.logger.info(context, "Starting manual re-verification", {
      chatbotId,
    });

    try {
      // Get current chatbot data
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} not found`);
      }

      const config = chatbot.config as any;
      const expectedChunkCount = config?.chunkCount || 0;

      // Perform verification
      const metadata = await this.verifyTrainingCompletion(
        chatbotId,
        expectedChunkCount,
      );

      // Update chatbot status based on verification
      if (metadata.verified) {
        await this.updateChatbotStatus(chatbotId, "ready");
      } else {
        await this.updateChatbotStatus(chatbotId, "failed");
      }

      this.logger.logInfo(context, "Re-verification completed", {
        verified: metadata.verified,
      });

      return metadata;
    } catch (error) {
      this.logger.logError(context, error as Error, "reverify_training");
      throw error;
    }
  }

  /**
   * Gets training metadata for a chatbot
   *
   * @param chatbotId - The chatbot identifier
   * @returns Training metadata or null if not found
   */
  async getTrainingMetadata(
    chatbotId: string,
  ): Promise<TrainingMetadata | null> {
    try {
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
      });

      if (!chatbot) {
        return null;
      }

      const config = chatbot.config as any;

      return {
        chatbotId,
        chunkCount: config?.chunkCount || 0,
        embeddingConfig: {
          provider: config?.embeddingProvider || "gemini",
          model: config?.embeddingModel || "embedding-001",
          dimensions: config?.embeddingDimensions || 768,
        },
        trainedAt: chatbot.createdAt,
        verified: config?.verified || false,
        verificationDetails: config?.verificationDetails || null,
      };
    } catch (error) {
      console.error("Failed to get training metadata:", error);
      return null;
    }
  }

  // Helper methods

  private async getCurrentEmbeddingConfig(): Promise<EmbeddingConfig> {
    return {
      provider: (this.config.embedding.provider as any) || "gemini",
      model: this.config.embedding.model,
      dimensions: this.config.embedding.dimensions,
    };
  }

  private async getChatbotConfig(chatbotId: string): Promise<any> {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });
    return chatbot?.config || {};
  }

  private async updateChatbotStatus(
    chatbotId: string,
    status: "training" | "ready" | "failed",
  ): Promise<void> {
    await prisma.chatbot.update({
      where: { id: chatbotId },
      data: { status },
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
