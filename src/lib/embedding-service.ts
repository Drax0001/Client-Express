/**
 * Embedding Service Module
 *
 * This module provides an interface to embedding models for generating vector
 * representations of text. It supports both Google Gemini and local embedding endpoints.
 *
 * Requirements: 5.1, 6.2, 15.3
 */

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { AppConfig, EmbeddingConfig, getConfig } from "./config";
import {
  LLMError,
  QuotaExceededError,
  TimeoutError,
  ServiceUnavailableError,
} from "./errors";
import { CircuitBreaker, withRetryAndCircuitBreaker } from "./retry";
import { getEmbeddingCache } from "./cache";

// For local embedding endpoints
interface LocalEmbeddingRequest {
  texts: string[];
}

type OpenAIEmbeddingRequest = {
  model: string;
  input: string | string[];
};

interface LocalEmbeddingResponse {
  embeddings: number[][];
}

type OpenAIEmbeddingsResponse = {
  data?: Array<{ embedding?: number[] }>;
};

/**
 * EmbeddingService class
 * Handles embedding generation for document chunks and user queries
 */
export class EmbeddingService {
  private model: GoogleGenerativeAIEmbeddings | null = null;
  private config: AppConfig;
  private circuitBreaker: CircuitBreaker;
  private isLocalProvider: boolean = false;
  private cache = getEmbeddingCache();

  constructor(override?: Partial<EmbeddingConfig>) {
    const config = getConfig();
    this.config = override
      ? { ...config, embedding: { ...config.embedding, ...override } }
      : config;
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Initializes the embedding model based on configuration
   * @private
   */
  private initializeModel(): GoogleGenerativeAIEmbeddings | null {
    const { embedding } = this.config;

    if (embedding.provider === "gemini") {
      if (this.model) {
        return this.model;
      }

      if (!embedding.apiKey) {
        throw new LLMError(
          "Google API key is required for Gemini embedding provider",
        );
      }

      this.model = new GoogleGenerativeAIEmbeddings({
        apiKey: embedding.apiKey,
        model: embedding.modelName,
      });
      this.isLocalProvider = false;
      return this.model;
    } else if (embedding.provider === "local") {
      // For local embedding endpoints, we use HTTP client
      this.isLocalProvider = true;
      return null;
    } else {
      throw new LLMError(
        `Unsupported embedding provider: ${embedding.provider}`,
      );
    }
  }

  /**
   * Calls a local embedding endpoint via HTTP
   * @private
   */
  private async callLocalEmbedding(text: string): Promise<number[]> {
    const { embedding } = this.config;

    if (!embedding.endpoint) {
      throw new LLMError(
        "Local embedding endpoint is required for local provider",
      );
    }

    try {
      const tryRequest = async (body: unknown) => {
        const res = await fetch(embedding.endpoint!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        return res;
      };

      // Attempt 1: custom { texts: [...] }
      let response = await tryRequest({ texts: [text] } satisfies LocalEmbeddingRequest);

      // Attempt 2 (fallback): OpenAI-compatible { model, input }
      if (!response.ok) {
        response = await tryRequest({
          model: embedding.modelName,
          input: text,
        } satisfies OpenAIEmbeddingRequest);
      }

      if (!response.ok) {
        throw new LLMError(
          `Local embedding request failed: ${response.status} ${response.statusText}`,
        );
      }

      const raw: unknown = await response.json();

      // Support two shapes:
      // - { embeddings: number[][] }
      // - OpenAI-compatible: { data: [{ embedding: number[] }] }
      const data = raw as Partial<LocalEmbeddingResponse> & OpenAIEmbeddingsResponse;
      const embeddingVector =
        Array.isArray(data.embeddings) && Array.isArray(data.embeddings[0])
          ? data.embeddings[0]
          : Array.isArray(data.data) && Array.isArray(data.data[0]?.embedding)
            ? (data.data[0]?.embedding as number[])
            : null;

      if (!embeddingVector || embeddingVector.length === 0) {
        const preview = JSON.stringify(raw)?.slice(0, 600);
        throw new LLMError(
          `Invalid response from local embedding endpoint (${embedding.endpoint}). Expected {embeddings:number[][]} or OpenAI {data:[{embedding:number[]}]}. Got: ${preview}`,
        );
      }

      for (const v of embeddingVector) {
        if (typeof v !== "number" || Number.isNaN(v)) {
          const preview = JSON.stringify(raw)?.slice(0, 600);
          throw new LLMError(
            `Invalid response from local embedding endpoint (${embedding.endpoint}). Non-numeric value found in embedding. Got: ${preview}`,
          );
        }
      }

      return embeddingVector;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Failed to call local embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Calls a local embedding endpoint for batch processing
   * @private
   */
  private async callLocalBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const { embedding } = this.config;

    if (!embedding.endpoint) {
      throw new LLMError(
        "Local embedding endpoint is required for local provider",
      );
    }

    try {
      const tryRequest = async (body: unknown) => {
        const res = await fetch(embedding.endpoint!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        return res;
      };

      // Attempt 1: custom { texts: [...] }
      let response = await tryRequest({ texts } satisfies LocalEmbeddingRequest);

      // Attempt 2 (fallback): OpenAI-compatible { model, input }
      if (!response.ok) {
        response = await tryRequest({
          model: embedding.modelName,
          input: texts,
        } satisfies OpenAIEmbeddingRequest);
      }

      if (!response.ok) {
        throw new LLMError(
          `Local embedding batch request failed: ${response.status} ${response.statusText}`,
        );
      }

      const raw: unknown = await response.json();

      // Support two shapes:
      // - { embeddings: number[][] }
      // - OpenAI-compatible: { data: [{ embedding: number[] }, ...] }
      const data = raw as Partial<LocalEmbeddingResponse> & OpenAIEmbeddingsResponse;
      const vectors =
        Array.isArray(data.embeddings)
          ? data.embeddings
          : Array.isArray(data.data)
            ? data.data.map((d) => d.embedding).filter(Boolean)
            : null;

      if (!vectors || vectors.length !== texts.length) {
        const preview = JSON.stringify(raw)?.slice(0, 600);
        throw new LLMError(
          `Invalid response from local embedding endpoint (${embedding.endpoint}). Expected ${texts.length} embeddings, got ${vectors ? vectors.length : 0}. Response: ${preview}`,
        );
      }

      for (let i = 0; i < vectors.length; i++) {
        const e = vectors[i];
        if (!Array.isArray(e) || e.length === 0) {
          const preview = JSON.stringify(raw)?.slice(0, 600);
          throw new LLMError(
            `Invalid response from local embedding endpoint (${embedding.endpoint}). Empty embedding at index ${i}. Response: ${preview}`,
          );
        }
        for (const v of e) {
          if (typeof v !== "number" || Number.isNaN(v)) {
            const preview = JSON.stringify(raw)?.slice(0, 600);
            throw new LLMError(
              `Invalid response from local embedding endpoint (${embedding.endpoint}). Non-numeric value in embedding at index ${i}. Response: ${preview}`,
            );
          }
        }
      }

      return vectors as number[][];
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Failed to call local embedding batch: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generates an embedding vector for a single text string
   *
   * This method is used for generating query embeddings during the chat flow.
   * The embedding dimensions are determined by the configured model.
   *
   * Requirements:
   * - 5.1: Generates embeddings for document chunks
   * - 6.2: Generates embeddings for user queries using the same model
   * - 15.3: Supports configuration from environment variables
   * - 9.5: Caches embeddings to reduce API calls
   *
   * @param text - The text to generate an embedding for
   * @returns A promise that resolves to a number array representing the embedding vector
   * @throws LLMError if embedding generation fails
   * @throws QuotaExceededError if API quota is exceeded
   * @throws TimeoutError if the request times out
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.cache.getCachedEmbedding(text);
    if (cached) {
      console.log("[EmbeddingService] Cache hit for embedding");
      return cached;
    }

    console.log("[EmbeddingService] Cache miss for embedding");

    try {
      const embedding = await withRetryAndCircuitBreaker(async () => {
        // Initialize model (or check provider type)
        this.initializeModel();

        if (this.isLocalProvider) {
          // Use local embedding endpoint
          return await this.callLocalEmbedding(text);
        } else {
          // Use Gemini
          const model = this.model!;
          return await model.embedQuery(text);
        }
      }, this.circuitBreaker);

      // Cache the successful embedding
      this.cache.cacheEmbedding(text, embedding);

      return embedding;
    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes("Circuit breaker is OPEN")) {
        throw new ServiceUnavailableError(
          "Embedding service temporarily unavailable",
        );
      }

      if (error.message?.includes("quota")) {
        throw new QuotaExceededError("Embedding API quota exceeded");
      }

      if (error.message?.includes("timeout")) {
        throw new TimeoutError("Embedding request timed out");
      }

      // Generic embedding error
      throw new LLMError(
        `Failed to generate embedding: ${error.message || "Unknown error"}`,
      );
    }
  }

  /**
   * Generates embedding vectors for multiple text strings in batch
   *
   * This method is used for generating embeddings for document chunks during
   * the document processing pipeline. Batch processing is more efficient than
   * generating embeddings one at a time.
   *
   * Requirements:
   * - 5.1: Generates embeddings for all document chunks
   * - 15.3: Supports configuration from environment variables
   *
   * @param texts - An array of text strings to generate embeddings for
   * @returns A promise that resolves to a 2D array where each inner array is an embedding vector
   * @throws LLMError if embedding generation fails
   * @throws QuotaExceededError if API quota is exceeded
   * @throws TimeoutError if the request times out
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const trimmedTexts = texts.map((t) => (typeof t === "string" ? t.trim() : ""));
    const firstEmptyIndex = trimmedTexts.findIndex((t) => t.length === 0);
    if (firstEmptyIndex !== -1) {
      throw new LLMError(
        `Cannot generate embeddings for empty text (index ${firstEmptyIndex})`,
      );
    }

    try {
      const embeddings = await withRetryAndCircuitBreaker(async () => {
        // Initialize model (or check provider type)
        this.initializeModel();

        if (this.isLocalProvider) {
          // Use local embedding endpoint
          return await this.callLocalBatchEmbeddings(trimmedTexts);
        } else {
          // Use Gemini
          const model = this.model!;
          return await model.embedDocuments(trimmedTexts);
        }
      }, this.circuitBreaker);

      // Validate response shape (some providers may return empty vectors on bad input)
      if (!Array.isArray(embeddings) || embeddings.length !== trimmedTexts.length) {
        throw new LLMError("Embedding provider returned an invalid embeddings array");
      }

      // Some providers occasionally return empty vectors for batch calls.
      // Try to repair by regenerating those indices one-by-one.
      const emptyIndexes: number[] = [];
      for (let i = 0; i < embeddings.length; i++) {
        const e = embeddings[i];
        if (!Array.isArray(e) || e.length === 0) {
          emptyIndexes.push(i);
        }
      }

      if (emptyIndexes.length > 0) {
        for (const i of emptyIndexes) {
          const repaired = await this.generateEmbedding(trimmedTexts[i]);
          embeddings[i] = repaired;
        }
      }

      for (let i = 0; i < embeddings.length; i++) {
        const e = embeddings[i];
        if (!Array.isArray(e) || e.length === 0) {
          throw new LLMError(
            `Embedding provider returned an empty embedding at index ${i}`,
          );
        }
        for (const v of e) {
          if (typeof v !== "number" || Number.isNaN(v)) {
            throw new LLMError(
              `Embedding provider returned a non-numeric value at index ${i}`,
            );
          }
        }
      }

      return embeddings;
    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes("Circuit breaker is OPEN")) {
        throw new ServiceUnavailableError(
          "Embedding service temporarily unavailable",
        );
      }

      if (error.message?.includes("quota")) {
        throw new QuotaExceededError("Embedding API quota exceeded");
      }

      if (error.message?.includes("timeout")) {
        throw new TimeoutError("Embedding request timed out");
      }

      // Generic embedding error
      throw new LLMError(
        `Failed to generate batch embeddings: ${
          error.message || "Unknown error"
        }`,
      );
    }
  }

  /**
   * Resets the model instance
   * Useful for testing or when configuration changes
   */
  resetModel(): void {
    this.model = null;
  }

  /**
   * Gets cache statistics
   * Useful for monitoring cache performance
   *
   * @returns Object containing cache hit/miss counts and hit rate
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    keys: number;
  } {
    return this.cache.getStats();
  }

  /**
   * Clears the embedding cache
   * Useful for testing or when cache needs to be invalidated
   */
  clearCache(): void {
    this.cache.clear();
  }
}
