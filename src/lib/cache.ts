/**
 * Simple in-memory response cache for GET endpoints
 * Requirements: 10.1-10.8
 */

const cache = new Map<string, { body: unknown; expiresAt: number }>()
const DEFAULT_TTL_MS = 60 * 1000 // 1 minute

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.body as T
}

export function setCached(key: string, body: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, { body, expiresAt: Date.now() + ttlMs })
}

export function cacheKey(path: string, searchParams?: Record<string, string>): string {
  const q = searchParams ? new URLSearchParams(searchParams).toString() : ""
  return q ? `${path}?${q}` : path
}
