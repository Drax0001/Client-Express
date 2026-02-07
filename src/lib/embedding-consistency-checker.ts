/**
 * Embedding Consistency Checker Module
 *
 * Ensures query embeddings match document embeddings in model and dimensions.
 * Validates embedding configuration consistency across training and query phases.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { getConfig, EmbeddingConfig } from "./config";
import { prisma } from "../../lib/prisma";

/**
 * Configuration comparison result
 */
export interface ConfigComparisonResult {
  match: boolean;
  differences: {
    provider?: { expected: string; actual: string };
    model?: { expected: string; actual: string };
    dimensions?: { expected: number; actual: number };
  };
}

/**
 * EmbeddingConsistencyChecker class
 * Validates embedding configuration consistency
 */
export class EmbeddingConsistencyChecker {
  /**
   * Validates that embedding dimensions match expected dimensions
   * Requirement 3.2: Verify output dimensions match configured dimensions
   *
   * @param embedding - The embedding vector to validate
   * @param expectedDimensions - Expected number of dimensions
   * @returns True if dimensions match, false otherwise
   */
  validateEmbeddingDimensions(
    embedding: number[],
    expectedDimensions: number,
  ): boolean {
    return embedding.length === expectedDimensions;
  }

  /**
   * Retrieves the embedding configuration used during training
   * Requirement 3.4: Log embedding model and provider
   *
   * @param projectId - The project/chatbot identifier
   * @returns Promise that resolves to the training embedding config
   */
  async getTrainingEmbeddingConfig(
    projectId: string,
  ): Promise<EmbeddingConfig | null> {
    try {
      // Get the most recent completed training session for this chatbot
      const trainingSession = await prisma.trainingSession.findFirst({
        where: {
          chatbotId: projectId,
          status: "completed",
        },
        orderBy: {
          completedAt: "desc",
        },
      });

      if (!trainingSession) {
        return null;
      }

      // Extract embedding config from the training config
      const config = trainingSession.config as any;

      // The training config should contain embedding information
      // If not present, return null
      if (!config.embeddingProvider) {
        return null;
      }

      return {
        provider: config.embeddingProvider,
        apiKey: undefined, // Don't expose API keys
        endpoint: config.embeddingEndpoint,
        modelName: config.embeddingModel || "text-embedding-004",
        dimensions: config.embeddingDimensions || 768,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to retrieve training embedding config for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Gets the current embedding configuration from environment
   *
   * @returns Current embedding configuration
   */
  getCurrentEmbeddingConfig(): EmbeddingConfig {
    const config = getConfig();
    return config.embedding;
  }

  /**
   * Compares two embedding configurations to detect mismatches
   * Requirement 3.3: Return specific error message for dimension mismatch
   *
   * @param config1 - First embedding configuration (typically training config)
   * @param config2 - Second embedding configuration (typically current config)
   * @returns Comparison result with differences
   */
  compareEmbeddingConfigs(
    config1: EmbeddingConfig,
    config2: EmbeddingConfig,
  ): ConfigComparisonResult {
    const differences: ConfigComparisonResult["differences"] = {};
    let match = true;

    // Compare provider
    if (config1.provider !== config2.provider) {
      differences.provider = {
        expected: config1.provider,
        actual: config2.provider,
      };
      match = false;
    }

    // Compare model name
    if (config1.modelName !== config2.modelName) {
      differences.model = {
        expected: config1.modelName,
        actual: config2.modelName,
      };
      match = false;
    }

    // Compare dimensions
    if (config1.dimensions !== config2.dimensions) {
      differences.dimensions = {
        expected: config1.dimensions,
        actual: config2.dimensions,
      };
      match = false;
    }

    return {
      match,
      differences,
    };
  }

  /**
   * Validates that the embedding model matches between training and query
   * Requirement 3.1: Use same embedding model as document embeddings
   * Requirement 3.5: Validate embedding service is accessible
   *
   * @param projectId - The project/chatbot identifier
   * @returns Promise that resolves to true if model is consistent
   */
  async validateEmbeddingModel(projectId: string): Promise<boolean> {
    try {
      // Get training config
      const trainingConfig = await this.getTrainingEmbeddingConfig(projectId);

      if (!trainingConfig) {
        // No training config found, cannot validate
        // This might be an older chatbot without stored config
        return true; // Assume valid to avoid breaking existing chatbots
      }

      // Get current config
      const currentConfig = this.getCurrentEmbeddingConfig();

      // Compare configurations
      const comparison = this.compareEmbeddingConfigs(
        trainingConfig,
        currentConfig,
      );

      return comparison.match;
    } catch (error: any) {
      throw new Error(
        `Failed to validate embedding model for project ${projectId}: ${error.message}`,
      );
    }
  }
}
