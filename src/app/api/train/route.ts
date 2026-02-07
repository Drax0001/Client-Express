/**
 * POST /api/train - Start training session
 * Initiates the training pipeline for uploaded documents
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4
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
 * POST /api/train
 * Starts training with validated configuration
 */
export async function POST(request: NextRequest) {
  return disabledResponse();
}

/**
 * Validates training configuration
 */
function validateTrainingConfig(config: any): string[] {
  const errors: string[] = [];

  // Required fields
  if (!config.name || typeof config.name !== 'string' || config.name.trim().length === 0) {
    errors.push("name is required and must be a non-empty string");
  }

  if (typeof config.chunkSize !== 'number' || config.chunkSize < 500 || config.chunkSize > 2000) {
    errors.push("chunkSize must be a number between 500 and 2000");
  }

  if (typeof config.chunkOverlap !== 'number' || config.chunkOverlap < 0 || config.chunkOverlap >= config.chunkSize) {
    errors.push("chunkOverlap must be a number between 0 and chunkSize-1");
  }

  if (!config.embeddingModel || typeof config.embeddingModel !== 'string') {
    errors.push("embeddingModel is required and must be a string");
  }

  if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 0.5) {
    errors.push("temperature must be a number between 0 and 0.5");
  }

  if (typeof config.maxTokens !== 'number' || config.maxTokens < 100 || config.maxTokens > 4096) {
    errors.push("maxTokens must be a number between 100 and 4096");
  }

  // Optional fields
  if (config.description && typeof config.description !== 'string') {
    errors.push("description must be a string if provided");
  }

  return errors;
}