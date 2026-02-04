/**
 * AnalyticsService - Training metrics, usage analytics, error tracking
 * Requirements: 10.1-10.8
 */

import { prisma } from "@/lib/prisma"

export interface TrainingMetrics {
  totalSessions: number
  completed: number
  failed: number
  cancelled: number
  averageDurationMs: number
  byDay: { date: string; count: number }[]
}

export interface UsageAnalytics {
  totalQueries: number
  totalTokens: number
  uniqueChatbots: number
  queriesByChatbot: { chatbotId: string; name: string; count: number }[]
  byDay: { date: string; queries: number; tokens: number }[]
}

export interface ErrorSummary {
  count: number
  lastOccurrence: string
  sampleMessage: string
}

export class AnalyticsService {
  async getTrainingMetrics(userId?: string, days: number = 30): Promise<TrainingMetrics> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const where: { createdAt?: { gte: Date } } = { createdAt: { gte: since } }
    const sessions = await prisma.trainingSession.findMany({
      where,
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
      },
    })

    const completed = sessions.filter((s) => s.status === "completed").length
    const failed = sessions.filter((s) => s.status === "failed").length
    const cancelled = sessions.filter((s) => s.status === "cancelled").length
    const withDuration = sessions.filter(
      (s) => s.status === "completed" && s.completedAt && s.createdAt
    )
    const averageDurationMs =
      withDuration.length > 0
        ? withDuration.reduce(
            (sum, s) =>
              sum + (new Date(s.completedAt!).getTime() - new Date(s.createdAt).getTime()),
            0
          ) / withDuration.length
        : 0

    const byDayMap = new Map<string, number>()
    sessions.forEach((s) => {
      const d = s.createdAt.toISOString().slice(0, 10)
      byDayMap.set(d, (byDayMap.get(d) ?? 0) + 1)
    })
    const byDay = Array.from(byDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalSessions: sessions.length,
      completed,
      failed,
      cancelled,
      averageDurationMs: Math.round(averageDurationMs),
      byDay,
    }
  }

  async getUsageAnalytics(userId?: string, days: number = 30): Promise<UsageAnalytics> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const chatbots = await prisma.chatbot.findMany({
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        name: true,
        queryCount: true,
        totalTokens: true,
      },
    })

    const totalQueries = chatbots.reduce((s, c) => s + c.queryCount, 0)
    const totalTokens = chatbots.reduce((s, c) => s + c.totalTokens, 0)

    const queriesByChatbot = chatbots.map((c) => ({
      chatbotId: c.id,
      name: c.name,
      count: c.queryCount,
    }))

    const messages = await prisma.chatMessage.findMany({
      where: {
        role: "user",
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    })
    const byDayMap = new Map<string, { queries: number; tokens: number }>()
    messages.forEach((m) => {
      const d = m.createdAt.toISOString().slice(0, 10)
      const cur = byDayMap.get(d) ?? { queries: 0, tokens: 0 }
      cur.queries += 1
      byDayMap.set(d, cur)
    })
    const byDay = Array.from(byDayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalQueries,
      totalTokens,
      uniqueChatbots: chatbots.length,
      queriesByChatbot: queriesByChatbot.sort((a, b) => b.count - a.count),
      byDay,
    }
  }

  async recordError(context: string, message: string, metadata?: Record<string, unknown>) {
    // In-memory or DB: for simplicity we just log; can add ErrorLog model later
    console.error("[Analytics] Error:", context, message, metadata)
  }

  async getErrorSummary(): Promise<ErrorSummary | null> {
    return null
  }
}
