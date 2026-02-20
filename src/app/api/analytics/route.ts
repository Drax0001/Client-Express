/**
 * GET /api/analytics - Training metrics and usage analytics
 * Requirements: 10.1-10.8
 */

import { NextRequest, NextResponse } from "next/server"
import { AnalyticsService } from "@/services/analytics.service"
import { errorHandler } from "@/lib/error-handler"

const analyticsService = new AnalyticsService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30")))
    const type = searchParams.get("type") ?? "all"
    const body = {
      training: trainingMetrics ?? undefined,
      usage: usageAnalytics ?? undefined,
      periodDays: days,
    }

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=60" },
    })
  } catch (err) {
    return errorHandler(err)
  }
}
