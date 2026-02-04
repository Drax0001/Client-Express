/**
 * In-memory rate limiter for API routes
 * Requirements: 11.1, 11.2
 */

const store = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100 // per window per key

export function rateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  let entry = store.get(key)
  if (!entry) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    store.set(key, entry)
  }
  if (now >= entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + WINDOW_MS
  }
  entry.count += 1
  const allowed = entry.count <= MAX_REQUESTS
  const remaining = Math.max(0, MAX_REQUESTS - entry.count)
  return { allowed, remaining, resetAt: entry.resetAt }
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown"
  const path = new URL(request.url).pathname
  return `${ip}:${path}`
}
