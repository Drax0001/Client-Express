/**
 * POST /api/train - Start training session
 * Initiates the training pipeline for uploaded documents
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4
 */

import { NextRequest, NextResponse } from "next/server";
import { TrainingService, TrainingConfig } from "@/services/training.service";
import { UploadService } from "@/services/upload.service";
import { errorHandler } from "@/lib/error-handler";
import { auditLog } from "@/lib/audit";

const trainingService = new TrainingService();
const uploadService = new UploadService();

/**
 * POST /api/train
 * Starts training with validated configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("API: Train - received request:", {
      uploadId: body.uploadId,
      hasConfig: !!body.configuration,
    });

    // Validate required fields
    if (!body.uploadId) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "uploadId is required",
        },
        { status: 400 }
      );
    }

    if (!body.configuration) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "configuration is required",
        },
        { status: 400 }
      );
    }

    const { uploadId, configuration } = body;

    // Validate configuration
    const configErrors = validateTrainingConfig(configuration);
    if (configErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: configErrors.join(", "),
        },
        { status: 400 }
      );
    }

    // Check if upload session exists and is valid for training
    const validation = uploadService.validateSessionForTraining(uploadId);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid upload session",
          details: validation.issues.join(", "),
        },
        { status: 400 }
      );
    }

    console.log(`API: Train - starting training for upload ${uploadId} with config:`, configuration);

    // Start training
    const result = await trainingService.startTraining(uploadId, configuration);

    auditLog({
      action: "training.start",
      resourceId: result.trainingId,
      metadata: { chatbotId: result.chatbotId, uploadId },
    });

    const response = {
      trainingId: result.trainingId,
      chatbotId: result.chatbotId,
      status: "queued",
      message: "Training started successfully",
      estimatedDuration: Math.round(validation.totalSize / 1000000 * 60), // Rough estimate: 1 minute per MB
      config: configuration,
    };

    console.log(`API: Train - training started:`, {
      trainingId: result.trainingId,
      chatbotId: result.chatbotId
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error("API: Train - unexpected error:", error);
    return errorHandler(error);
  }
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