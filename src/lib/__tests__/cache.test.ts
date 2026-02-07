/**
 * Tests for Embedding Cache Module
 *
 * Requirements: 9.5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EmbeddingCache, getEmbeddingCache, resetCache } from "../cache";

describe("EmbeddingCache", () => {
  let cache: EmbeddingCache;

  beforeEach(() => {
    resetCache();
    cache = new EmbeddingCache({
      ttlSeconds: 60,
      checkPeriodSeconds: 10,
      maxKeys: 100,
    });
  });

  describe("getCachedEmbedding", () => {
    it("should return null for uncached text", () => {
      const result = cache.getCachedEmbedding("test text");
      expect(result).toBeNull();
    });

    it("should return cached embedding for previously cached text", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache.cacheEmbedding(text, embedding);
      const result = cache.getCachedEmbedding(text);

      expect(result).toEqual(embedding);
    });

    it("should handle different texts independently", () => {
      const text1 = "first text";
      const text2 = "second text";
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      cache.cacheEmbedding(text1, embedding1);
      cache.cacheEmbedding(text2, embedding2);

      expect(cache.getCachedEmbedding(text1)).toEqual(embedding1);
      expect(cache.getCachedEmbedding(text2)).toEqual(embedding2);
    });
  });

  describe("cacheEmbedding", () => {
    it("should store embedding for retrieval", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache.cacheEmbedding(text, embedding);
      const result = cache.getCachedEmbedding(text);

      expect(result).toEqual(embedding);
    });

    it("should overwrite existing cached embedding", () => {
      const text = "test text";
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      cache.cacheEmbedding(text, embedding1);
      cache.cacheEmbedding(text, embedding2);

      const result = cache.getCachedEmbedding(text);
      expect(result).toEqual(embedding2);
    });
  });

  describe("getStats", () => {
    it("should track cache hits and misses", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      // Miss
      cache.getCachedEmbedding(text);

      // Cache it
      cache.cacheEmbedding(text, embedding);

      // Hit
      cache.getCachedEmbedding(text);
      cache.getCachedEmbedding(text);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it("should return zero hit rate when no requests made", () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all cached embeddings", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache.cacheEmbedding(text, embedding);
      cache.clear();

      const result = cache.getCachedEmbedding(text);
      expect(result).toBeNull();
    });

    it("should reset hit/miss counters", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache.cacheEmbedding(text, embedding);
      cache.getCachedEmbedding(text);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("has", () => {
    it("should return false for uncached text", () => {
      expect(cache.has("test text")).toBe(false);
    });

    it("should return true for cached text", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache.cacheEmbedding(text, embedding);
      expect(cache.has(text)).toBe(true);
    });
  });

  describe("remove", () => {
    it("should remove specific cached embedding", () => {
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache.cacheEmbedding(text, embedding);
      cache.remove(text);

      expect(cache.getCachedEmbedding(text)).toBeNull();
    });

    it("should not affect other cached embeddings", () => {
      const text1 = "first text";
      const text2 = "second text";
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      cache.cacheEmbedding(text1, embedding1);
      cache.cacheEmbedding(text2, embedding2);

      cache.remove(text1);

      expect(cache.getCachedEmbedding(text1)).toBeNull();
      expect(cache.getCachedEmbedding(text2)).toEqual(embedding2);
    });
  });

  describe("getEmbeddingCache singleton", () => {
    it("should return the same instance on multiple calls", () => {
      const cache1 = getEmbeddingCache();
      const cache2 = getEmbeddingCache();

      expect(cache1).toBe(cache2);
    });

    it("should maintain state across calls", () => {
      const cache1 = getEmbeddingCache();
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache1.cacheEmbedding(text, embedding);

      const cache2 = getEmbeddingCache();
      expect(cache2.getCachedEmbedding(text)).toEqual(embedding);
    });
  });

  describe("resetCache", () => {
    it("should create a new cache instance", () => {
      const cache1 = getEmbeddingCache();
      const text = "test text";
      const embedding = [0.1, 0.2, 0.3];

      cache1.cacheEmbedding(text, embedding);

      resetCache();

      const cache2 = getEmbeddingCache();
      expect(cache2.getCachedEmbedding(text)).toBeNull();
    });
  });
});
