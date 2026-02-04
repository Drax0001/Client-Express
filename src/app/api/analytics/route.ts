/**
 * GET /api/analytics - Training metrics and usage analytics
 * Requirements: 10.1-10.8
 */

import { NextRequest, NextResponse } from "next/server"
import { AnalyticsService } from "@/services/analytics.service"
import { errorHandler } from "@/lib/error-handler"
import { getCached, setCached, cacheKey } from "@/lib/cache"

const analyticsService = new AnalyticsService()
const CACHE_TTL_MS = 60 * 1000 // 1 minute

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30")))
    const type = searchParams.get("type") ?? "all"
    const key = cacheKey("/analytics", { days: String(days), type })
    const cached = getCached<object>(key)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, max-age=60" },
      })
    }

    const [trainingMetrics, usageAnalytics] = await Promise.all([
      type === "usage" ? null : analyticsService.getTrainingMetrics(undefined, days),
      type === "training" ? null : analyticsService.getUsageAnalytics(undefined, days),
    ])

    const body = {
      training: trainingMetrics ?? undefined,
      usage: usageAnalytics ?? undefined,
      periodDays: days,
    }
    setCached(key, body, CACHE_TTL_MS)

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=60" },
    })
  } catch (err) {
    return errorHandler(err)
  }
}
