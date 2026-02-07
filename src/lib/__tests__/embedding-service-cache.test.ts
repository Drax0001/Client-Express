/**
 * Integration tests for EmbeddingService with cache
 *
 * Requirements: 9.5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getEmbeddingCache, resetCache } from "../cache";

describe("EmbeddingService Cache Integration", () => {
  beforeEach(() => {
    resetCache();
  });

  describe("cache functionality", () => {
    it("should cache and retrieve embeddings", () => {
      const cache = getEmbeddingCache();
      const text = "test query";
      const embedding = Array(768)
        .fill(0)
        .map((_, i) => i / 1000);

      // Cache the embedding
      cache.cacheEmbedding(text, embedding);

      // Retrieve from cache
      const cached = cache.getCachedEmbedding(text);
      expect(cached).toEqual(embedding);

      // Check stats
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it("should handle cache misses", () => {
      const cache = getEmbeddingCache();
      const text = "uncached query";

      // Try to retrieve uncached embedding
      const cached = cache.getCachedEmbedding(text);
      expect(cached).toBeNull();

      // Check stats
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });

    it("should track hit rate correctly", () => {
      const cache = getEmbeddingCache();
      const text1 = "query 1";
      const text2 = "query 2";
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      // Cache two embeddings
      cache.cacheEmbedding(text1, embedding1);
      cache.cacheEmbedding(text2, embedding2);

      // Miss on uncached text
      cache.getCachedEmbedding("uncached");

      // Hit on cached texts
      cache.getCachedEmbedding(text1);
      cache.getCachedEmbedding(text2);
      cache.getCachedEmbedding(text1);

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.75); // 3/4 = 0.75
    });

    it("should use consistent keys for same text", () => {
      const cache = getEmbeddingCache();
      const text = "test query";
      const embedding = [0.1, 0.2, 0.3];

      // Cache the embedding
      cache.cacheEmbedding(text, embedding);

      // Retrieve with same text (should use same key)
      const cached1 = cache.getCachedEmbedding(text);
      const cached2 = cache.getCachedEmbedding(text);

      expect(cached1).toEqual(embedding);
      expect(cached2).toEqual(embedding);

      // Both should be cache hits
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });
  });
});
