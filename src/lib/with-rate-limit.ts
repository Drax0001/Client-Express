/**
 * Wrapper to apply rate limiting to API route handlers
 */

import { NextResponse } from "next/server"
import { rateLimit, getRateLimitKey } from "./rate-limit"

export function withRateLimit<T>(
  handler: (request: Request, context: T) => Promise<Response>,
  options?: { maxRequests?: number }
) {
  return async (request: Request, context: T): Promise<Response> => {
    const key = getRateLimitKey(request)
    const result = rateLimit(key)
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      )
    }
    return handler(request, context)
  }
}
