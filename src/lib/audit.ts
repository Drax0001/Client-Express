/**
 * Audit logging for security events
 * Requirements: 11.4
 */

export type AuditAction =
  | "chatbot.create"
  | "chatbot.delete"
  | "chatbot.update"
  | "training.start"
  | "training.cancel"
  | "conversation.delete"
  | "upload.create"
  | "auth.fail"

export interface AuditEntry {
  action: AuditAction
  userId?: string
  resourceId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

const entries: AuditEntry[] = []
const MAX_ENTRIES = 10_000

export function auditLog(entry: Omit<AuditEntry, "timestamp">) {
  const full: AuditEntry = { ...entry, timestamp: new Date().toISOString() }
  entries.push(full)
  if (entries.length > MAX_ENTRIES) entries.shift()
  console.info("[Audit]", full.action, full.resourceId ?? "", full.userId ?? "")
}

export function getAuditLog(limit: number = 100): AuditEntry[] {
  return entries.slice(-limit).reverse()
}

export function getAuditLogForResource(resourceId: string, limit: number = 50): AuditEntry[] {
  return entries.filter((e) => e.resourceId === resourceId).slice(-limit).reverse()
}
