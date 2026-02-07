/**
 * Embedding Cache Module
 *
 * This module provides caching functionality for embeddings to reduce API calls
 * and improve performance. It uses node-cache with TTL (Time To Live) configuration.
 *
 * Requirements: 9.5
 */

import NodeCache from "node-cache";
import { createHash } from "crypto";

/**
 * Cache configuration interface
 */
interface CacheConfig {
  ttlSeconds: number; // Time to live in seconds
  checkPeriodSeconds: number; // Period for automatic delete check
  maxKeys: number; // Maximum number of keys to store
}

/**
 * Default cache configuration
 * - TTL: 1 hour (3600 seconds)
 * - Check period: 10 minutes (600 seconds)
 * - Max keys: 1000 embeddings
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlSeconds: parseInt(process.env.EMBEDDING_CACHE_TTL || "3600", 10),
  checkPeriodSeconds: parseInt(
    process.env.EMBEDDING_CACHE_CHECK_PERIOD || "600",
    10,
  ),
  maxKeys: parseInt(process.env.EMBEDDING_CACHE_MAX_KEYS || "1000", 10),
};

/**
 * EmbeddingCache class
 * Manages caching of embedding vectors to reduce API calls
 */
export class EmbeddingCache {
  private cache: NodeCache;
  private config: CacheConfig;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
    this.cache = new NodeCache({
      stdTTL: config.ttlSeconds,
      checkperiod: config.checkPeriodSeconds,
      maxKeys: config.maxKeys,
      useClones: false, // Don't clone objects for better performance
    });
  }

  /**
   * Generates a cache key from text
   * Uses SHA-256 hash to create a consistent key regardless of text length
   *
   * @param text - The text to generate a key for
   * @returns A hash string to use as cache key
   */
  private generateKey(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }

  /**
   * Retrieves a cached embedding for the given text
   *
   * Requirements:
   * - 9.5: Returns cached embedding if available within TTL
   *
   * @param text - The text to retrieve embedding for
   * @returns The cached embedding vector or null if not found
   */
  getCachedEmbedding(text: string): number[] | null {
    const key = this.generateKey(text);
    const cached = this.cache.get<number[]>(key);

    if (cached) {
      this.hitCount++;
      return cached;
    }

    this.missCount++;
    return null;
  }

  /**
   * Stores an embedding in the cache
   *
   * Requirements:
   * - 9.5: Caches embedding with TTL configuration
   *
   * @param text - The text that was embedded
   * @param embedding - The embedding vector to cache
   */
  cacheEmbedding(text: string, embedding: number[]): void {
    const key = this.generateKey(text);
    this.cache.set(key, embedding);
  }

  /**
   * Gets cache statistics
   *
   * @returns Object containing cache hit/miss counts and hit rate
   */
  getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    keys: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate,
      size: this.cache.getStats().vsize,
      keys: this.cache.getStats().keys,
    };
  }

  /**
   * Clears all cached embeddings
   */
  clear(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Removes a specific cached embedding
   *
   * @param text - The text whose embedding should be removed
   */
  remove(text: string): void {
    const key = this.generateKey(text);
    this.cache.del(key);
  }

  /**
   * Checks if an embedding is cached
   *
   * @param text - The text to check
   * @returns True if the embedding is cached, false otherwise
   */
  has(text: string): boolean {
    const key = this.generateKey(text);
    return this.cache.has(key);
  }
}

/**
 * Singleton cache instance
 */
let cacheInstance: EmbeddingCache | null = null;

/**
 * Gets the embedding cache instance
 * Creates a new instance on first call, then returns cached instance
 *
 * @returns EmbeddingCache instance
 */
export function getEmbeddingCache(): EmbeddingCache {
  if (!cacheInstance) {
    cacheInstance = new EmbeddingCache();
  }
  return cacheInstance;
}

/**
 * Resets the cache instance
 * Useful for testing purposes
 */
export function resetCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
  cacheInstance = null;
}
