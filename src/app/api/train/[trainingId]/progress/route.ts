/**
 * GET /api/train/[trainingId]/progress - Get training progress
 * Provides real-time progress updates for training sessions
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest, NextResponse } from "next/server";

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
 * GET /api/train/[trainingId]/progress
 * Returns current training progress and status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainingId: string }> }
) {
  return disabledResponse();
}