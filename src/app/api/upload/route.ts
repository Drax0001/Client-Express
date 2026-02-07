/**
 * POST /api/upload - Upload files and URLs for training
 * Handles multipart form data with files and URLs, validates them, and creates upload sessions
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { NextRequest, NextResponse } from "next/server";
 
function disabledResponse() {
  return NextResponse.json(
    {
      error: "Disabled",
      details: "Legacy upload/training endpoints are currently disabled.",
    },
    { status: 410 },
  );
}

/**
 * POST /api/upload
 * Handles file and URL uploads for training sessions
 */
export async function POST(request: NextRequest) {
  return disabledResponse();
}

/**
 * GET /api/upload/:sessionId - Get upload session details
 * Useful for checking session status before training
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  return disabledResponse();
}