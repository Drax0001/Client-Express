/**
 * GET /api/analytics - Legacy analytics endpoint (deprecated)
 * Real analytics are served by /api/projects/[id]/analytics
 */

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { training: null, usage: null, periodDays: 30 },
    { headers: { "Cache-Control": "public, max-age=60" } }
  )
}
