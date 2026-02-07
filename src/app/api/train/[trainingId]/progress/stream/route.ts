/**
 * GET /api/train/[trainingId]/progress/stream - Server-Sent Events for real-time progress
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function disabledResponse() {
  return NextResponse.json(
    {
      error: "Disabled",
      details: "Legacy training endpoints are currently disabled.",
    },
    { status: 410 },
  );
}

/**
 * GET /api/train/[trainingId]/progress/stream
 * Streams training progress via Server-Sent Events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainingId: string }> }
) {
  return disabledResponse();
}
