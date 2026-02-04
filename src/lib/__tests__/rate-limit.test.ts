/**
 * Rate limit tests
 */

import { rateLimit, getRateLimitKey } from "../rate-limit"

describe("rateLimit", () => {
  beforeEach(() => {
    // Rate limit store is module-level; use unique keys per test to avoid interference
    const unique = `key-${Date.now()}-${Math.random()}`
    expect(rateLimit(unique).allowed).toBe(true)
  })

  it("allows requests under limit", () => {
    const key = `allow-${Date.now()}`
    const r = rateLimit(key)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBeLessThanOrEqual(100)
  })

  it("returns remaining and resetAt", () => {
    const key = `meta-${Date.now()}`
    const r = rateLimit(key)
    expect(typeof r.remaining).toBe("number")
    expect(typeof r.resetAt).toBe("number")
  })
})

describe("getRateLimitKey", () => {
  it("uses x-forwarded-for when present", () => {
    const req = new Request("http://localhost/api/chat", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    })
    const key = getRateLimitKey(req)
    expect(key).toContain("192.168.1.1")
    expect(key).toContain("/api/chat")
  })

  it("falls back to unknown when no forwarded header", () => {
    const req = new Request("http://localhost/api/train")
    const key = getRateLimitKey(req)
    expect(key).toContain("unknown")
    expect(key).toContain("/api/train")
  })
})
