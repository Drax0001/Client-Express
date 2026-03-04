/**
 * Technical settings routes - deprecated
 * Technical defaults were removed from the UI per user request.
 * These endpoints return sensible defaults from config.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConfig } from "@/lib/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getConfig();
  return NextResponse.json({
    relevanceThreshold: config.processing.relevanceThreshold,
    chunkSize: config.processing.chunkSize,
    chunkOverlap: config.processing.chunkOverlap,
    modelName: config.llm.modelName,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
  });
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Technical settings editing is disabled" },
    { status: 410 }
  );
}
