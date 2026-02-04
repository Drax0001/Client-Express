/**
 * Input sanitization for user content and URLs
 * Requirements: 11.1
 */

const HTML_REGEX = /<[^>]*>/g
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i

export function sanitizeText(input: string, maxLength: number = 100_000): string {
  if (typeof input !== "string") return ""
  let s = input.slice(0, maxLength)
  s = s.replace(SCRIPT_REGEX, "")
  s = s.replace(HTML_REGEX, "")
  return s.trim()
}

export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  if (DANGEROUS_PROTOCOLS.test(trimmed)) return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return u.href
  } catch {
    return null
  }
}

export function sanitizeForLog(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value.replace(/\n/g, " ").slice(0, 500)
  try {
    return JSON.stringify(value).slice(0, 500)
  } catch {
    return String(value).slice(0, 500)
  }
}
