/**
 * Sanitize tests
 */

import { sanitizeText, sanitizeUrl, sanitizeForLog } from "../sanitize"

describe("sanitizeText", () => {
  it("strips script tags", () => {
    expect(sanitizeText("<script>alert(1)</script>hello")).toBe("hello")
  })

  it("strips HTML tags", () => {
    expect(sanitizeText("<p>foo</p>")).toBe("foo")
  })

  it("trims and respects maxLength", () => {
    const long = "a".repeat(200)
    expect(sanitizeText(long, 50).length).toBe(50)
  })

  it("returns empty for non-string", () => {
    expect(sanitizeText(null as any)).toBe("")
  })
})

describe("sanitizeUrl", () => {
  it("allows https", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/")
  })

  it("rejects javascript:", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull()
  })

  it("rejects data:", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull()
  })

  it("returns null for invalid URL", () => {
    expect(sanitizeUrl("not a url")).toBeNull()
  })
})

describe("sanitizeForLog", () => {
  it("stringifies objects", () => {
    expect(sanitizeForLog({ a: 1 })).toContain("a")
  })

  it("truncates long strings", () => {
    expect(sanitizeForLog("a".repeat(600)).length).toBeLessThanOrEqual(500)
  })
})
