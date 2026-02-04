/**
 * GET /api/train/[trainingId]/progress - Get training progress
 * Provides real-time progress updates for training sessions
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest, NextResponse } from "next/server";
import { TrainingService } from "@/services/training.service";
import { errorHandler } from "@/lib/error-handler";

const trainingService = new TrainingService();

/**
 * GET /api/train/[trainingId]/progress
 * Returns current training progress and status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainingId: string }> }
) {
  try {
    const { trainingId } = await params;

    console.log(`API: Training progress - requested for ${trainingId}`);

    // Get training progress
    const progress = await trainingService.getTrainingProgress(trainingId);

    const response = {
      trainingId,
      status: progress.status,
      currentStep: progress.currentStep,
      progress: progress.progress,
      currentFile: progress.currentFile,
      errors: progress.errors,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      startedAt: progress.startedAt?.toISOString(),
      completedAt: progress.completedAt?.toISOString(),
      message: getProgressMessage(progress),
    };

    console.log(`API: Training progress - ${trainingId} at ${progress.progress}% (${progress.currentStep})`);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("API: Training progress - error:", error);
    return errorHandler(error);
  }
}

/**
 * Generates user-friendly progress messages
 */
function getProgressMessage(progress: any): string {
  switch (progress.status) {
    case "queued":
      return "Training is queued and will start shortly";

    case "processing":
      switch (progress.currentStep) {
        case "uploading":
          return "Preparing files for processing";
        case "extracting":
          return "Extracting text from documents";
        case "chunking":
          return "Breaking documents into chunks";
        case "embedding":
          return "Generating embeddings for semantic search";
        case "storing":
          return "Storing vectors in knowledge base";
        default:
          return `Processing: ${progress.currentStep}`;
      }

    case "completed":
      return "Training completed successfully! Your chatbot is ready.";

    case "failed":
      if (progress.errors && progress.errors.length > 0) {
        return `Training failed: ${progress.errors[0]}`;
      }
      return "Training failed. Please try again.";

    case "cancelled":
      return "Training was cancelled";

    default:
      return "Training status unknown";
  }
}