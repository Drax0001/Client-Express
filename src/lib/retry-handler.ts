/**
 * Retry Handler Module
 *
 * Implements exponential backoff retry logic with comprehensive logging
 * for embedding generation and other external service calls.
 *
 * Requirements: 9.3
 */

import { LogContext, RagLogger } from "./rag-logger";
import { EmbeddingService } from "./embedding-service";

/**
 * Configuration for retry behavior with exponential backoff
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * RetryHandler class
 * Provides retry logic with exponential backoff and comprehensive logging
 */
export class RetryHandler {
  private logger: RagLogger;
  private embeddingService: EmbeddingService;

  constructor(logger: RagLogger, embeddingService: EmbeddingService) {
    this.logger = logger;
    this.embeddingService = embeddingService;
  }

  /**
   * Generic retry method with exponential backoff
   * Retries an operation with exponential backoff and logs each attempt
   *
   * @param operation - The async operation to retry
   * @param config - Retry configuration
   * @param context - Log context for tracing
   * @returns Promise resolving to the operation result
   * @throws The last error if all retries fail
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: LogContext,
  ): Promise<T> {
    let lastError: Error | unknown;
    let attempt = 0;

    while (attempt < config.maxRetries) {
      attempt++;

      try {
        // Log retry attempt
        if (attempt > 1) {
          this.logger.info(
            context,
            `Retry attempt ${attempt}/${config.maxRetries}`,
            {
              attempt,
              maxRetries: config.maxRetries,
            },
          );
        }

        // Execute the operation
        const result = await operation();

        // Log success if this was a retry
        if (attempt > 1) {
          this.logger.info(
            context,
            `Operation succeeded on attempt ${attempt}`,
            {
              attempt,
              retriesNeeded: attempt - 1,
            },
          );
        }

        return result;
      } catch (error) {
        lastError = error;

        // Log the failure
        this.logger.warn(
          context,
          `Operation failed on attempt ${attempt}/${config.maxRetries}`,
          {
            attempt,
            maxRetries: config.maxRetries,
            error: error instanceof Error ? error.message : String(error),
          },
        );

        // If this was the last attempt, throw the error
        if (attempt >= config.maxRetries) {
          this.logger.logError(
            context,
            error instanceof Error ? error : new Error(String(error)),
            "retry_exhausted",
          );
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateBackoffDelay(attempt, config);

        // Log the delay
        this.logger.debug(context, `Waiting ${delay}ms before retry`, {
          delayMs: delay,
          nextAttempt: attempt + 1,
        });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError;
  }

  /**
   * Retry embedding generation with exponential backoff
   * Specialized retry method for embedding generation operations
   *
   * @param text - The text to generate an embedding for
   * @param context - Log context for tracing
   * @returns Promise resolving to the embedding vector
   * @throws Error if all retries fail
   */
  async retryEmbeddingGeneration(
    text: string,
    context: LogContext,
  ): Promise<number[]> {
    this.logger.debug(context, "Starting embedding generation with retry", {
      textLength: text.length,
      textPreview: text.substring(0, 100),
    });

    const config: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 8000,
      backoffMultiplier: 2,
    };

    try {
      const embedding = await this.retryWithBackoff(
        async () => {
          return await this.embeddingService.generateEmbedding(text);
        },
        config,
        context,
      );

      this.logger.debug(context, "Embedding generation successful", {
        dimensions: embedding.length,
        sampleValues: embedding.slice(0, 5),
      });

      return embedding;
    } catch (error) {
      this.logger.logError(
        context,
        error instanceof Error ? error : new Error(String(error)),
        "embedding_generation_failed_after_retries",
      );
      throw error;
    }
  }

  /**
   * Retry ChromaDB query with exponential backoff
   * Specialized retry method for ChromaDB operations
   *
   * @param query - The query function to execute
   * @param context - Log context for tracing
   * @returns Promise resolving to the query result
   * @throws Error if all retries fail
   */
  async retryChromaDBQuery(
    query: () => Promise<any>,
    context: LogContext,
  ): Promise<any> {
    this.logger.debug(context, "Starting ChromaDB query with retry");

    const config: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
    };

    try {
      const result = await this.retryWithBackoff(query, config, context);

      this.logger.debug(context, "ChromaDB query successful");

      return result;
    } catch (error) {
      this.logger.logError(
        context,
        error instanceof Error ? error : new Error(String(error)),
        "chromadb_query_failed_after_retries",
      );
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay with max cap
   * Formula: initialDelay * (backoffMultiplier ^ (attempt - 1))
   * Capped at maxDelayMs
   *
   * @param attempt - Current attempt number (1-indexed)
   * @param config - Retry configuration
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const delay =
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Sleep utility for async delays
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
