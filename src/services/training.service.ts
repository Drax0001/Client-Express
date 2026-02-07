/**
 * TrainingService - Orchestrates the complete training pipeline
 * Manages training sessions, progress tracking, and document processing
 */

import { prisma } from "../../lib/prisma";
import {
  getUploadSession,
  updateSessionStatus,
  UploadSession,
} from "../lib/upload-session";
import { TextExtractor } from "../lib/text-extractor";
import { TextChunker } from "../lib/text-chunker";
import { getConfig } from "../lib/config";
import { DatabaseError, ValidationError, NotFoundError } from "../lib/errors";
import { ChromaClient } from "chromadb";
import { EmbeddingService } from "../lib/embedding-service";
import { broadcastProgress } from "../lib/progress-broadcaster";

export interface TrainingConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
  name: string;
  description?: string;
}

export interface TrainingProgress {
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  currentStep:
    | "uploading"
    | "extracting"
    | "chunking"
    | "embedding"
    | "storing";
  progress: number; // 0-100
  currentFile?: string;
  errors: string[];
  estimatedTimeRemaining?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TrainedChatbot {
  id: string;
  name: string;
  description?: string;
  config: TrainingConfig;
  documentCount: number;
  totalChunks: number;
  createdAt: Date;
}

export class TrainingService {
  private textExtractor: TextExtractor;
  private textChunker: TextChunker;
  private chromaClient: ChromaClient;
  private embeddingService: EmbeddingService;
  private config = getConfig();

  constructor() {
    this.textExtractor = new TextExtractor();
    this.textChunker = new TextChunker();

    // Initialize ChromaDB client
    this.chromaClient = new ChromaClient({
      host: this.config.vectorStore.host,
      port: this.config.vectorStore.port,
      ssl: false,
    } as any);
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Starts a new training session
   *
   * @param uploadId - Upload session ID containing validated files/URLs
   * @param config - Training configuration
   * @param userId - User identifier
   * @returns Training session ID
   */
  async startTraining(
    uploadId: string,
    config: TrainingConfig,
    userId: string = "default",
  ): Promise<{ trainingId: string; chatbotId: string }> {
    // Validate upload session
    const uploadSession = getUploadSession(uploadId);
    if (!uploadSession) {
      throw new NotFoundError("Upload session not found or expired");
    }

    if (uploadSession.status !== "active") {
      throw new ValidationError("Upload session is not active");
    }

    try {
      // Create chatbot record
      const chatbot = await prisma.chatbot.create({
        data: {
          userId,
          name: config.name,
          description: config.description,
          config: config as any, // JSON field
          status: "training",
          documentCount: uploadSession.files.length + uploadSession.urls.length,
        },
      });

      // Create training session record
      const trainingSession = await prisma.trainingSession.create({
        data: {
          chatbotId: chatbot.id,
          uploadId,
          status: "queued",
          progress: {
            status: "queued",
            currentStep: "uploading",
            progress: 0,
            errors: [],
          } as any, // JSON field
          config: config as any, // JSON field
        },
      });

      // Mark upload session as completed
      updateSessionStatus(uploadId, "completed");

      // Start async training process
      this.processTrainingAsync(trainingSession.id, uploadSession, config);

      console.log(
        `TrainingService: Started training session ${trainingSession.id} for chatbot ${chatbot.id}`,
      );

      return {
        trainingId: trainingSession.id,
        chatbotId: chatbot.id,
      };
    } catch (error) {
      console.error("TrainingService: Failed to start training:", error);
      throw new DatabaseError(
        `Failed to start training: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Gets training progress for a session
   *
   * @param trainingId - Training session ID
   * @returns Current training progress
   */
  async getTrainingProgress(trainingId: string): Promise<TrainingProgress> {
    try {
      const trainingSession = await prisma.trainingSession.findUnique({
        where: { id: trainingId },
      });

      if (!trainingSession) {
        throw new NotFoundError("Training session not found");
      }

      const progress = trainingSession.progress as TrainingProgress;

      // Calculate estimated time remaining if processing
      if (progress.status === "processing" && progress.startedAt) {
        const elapsed = Date.now() - new Date(progress.startedAt).getTime();
        const estimatedTotal = this.estimateTrainingTime(
          trainingSession.config as TrainingConfig,
        );
        const remaining = Math.max(0, estimatedTotal - elapsed);

        progress.estimatedTimeRemaining = Math.round(remaining / 1000); // seconds
      }

      return progress;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to get training progress: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Cancels a training session
   *
   * @param trainingId - Training session ID
   * @returns Updated training progress
   */
  async cancelTraining(trainingId: string): Promise<TrainingProgress> {
    try {
      const trainingSession = await prisma.trainingSession.findUnique({
        where: { id: trainingId },
      });

      if (!trainingSession) {
        throw new NotFoundError("Training session not found");
      }

      if (
        trainingSession.status === "completed" ||
        trainingSession.status === "failed"
      ) {
        throw new ValidationError("Cannot cancel completed or failed training");
      }

      // Update training session status
      const updatedSession = await prisma.trainingSession.update({
        where: { id: trainingId },
        data: {
          status: "cancelled",
          progress: {
            ...(trainingSession.progress as object),
            status: "cancelled",
            completedAt: new Date(),
          } as any,
        },
      });

      // Update chatbot status
      await prisma.chatbot.update({
        where: { id: trainingSession.chatbotId },
        data: { status: "failed" }, // Cancelled trainings are marked as failed
      });

      console.log(`TrainingService: Cancelled training session ${trainingId}`);

      return updatedSession.progress as TrainingProgress;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to cancel training: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Processes documents for training (internal method)
   *
   * @param uploadSession - Upload session with validated files/URLs
   * @param config - Training configuration
   * @returns Processing results
   */
  private async processDocuments(
    uploadSession: UploadSession,
    config: TrainingConfig,
  ): Promise<{
    processedDocuments: any[];
    totalChunks: number;
  }> {
    const processedDocuments: any[] = [];
    const CONCURRENCY = 4;

    const processFile = async (file: (typeof uploadSession.files)[0]) => {
      if (file.status !== "ready") return null;
      const buffer = Buffer.from(await file.file.arrayBuffer());
      let extractedText: string;
      switch (file.metadata.detectedType) {
        case "pdf":
          extractedText = await this.textExtractor.extractFromPdf(buffer);
          break;
        case "docx":
          extractedText = await this.textExtractor.extractFromDocx(buffer);
          break;
        case "txt":
          extractedText = await this.textExtractor.extractFromTxt(buffer);
          break;
        default:
          throw new ValidationError(
            `Unsupported file type: ${file.metadata.detectedType}`,
          );
      }
      const chunks = await this.textChunker.chunkText(
        extractedText,
        file.metadata.name,
        config.chunkSize,
        config.chunkOverlap,
      );
      return {
        id: file.id,
        filename: file.metadata.name,
        type: "file",
        content: extractedText,
        chunks,
      };
    };

    const processUrl = async (url: (typeof uploadSession.urls)[0]) => {
      if (url.status !== "ready") return null;
      const extractedText = await this.textExtractor.extractFromUrl(url.url);
      const chunks = await this.textChunker.chunkText(
        extractedText,
        url.url,
        config.chunkSize,
        config.chunkOverlap,
      );
      return {
        id: url.id,
        filename: url.url,
        type: "url",
        content: extractedText,
        chunks,
      };
    };

    const runInBatches = async <T, R>(
      items: T[],
      fn: (item: T) => Promise<R | null>,
      batchSize: number,
    ): Promise<R[]> => {
      const results: R[] = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        batchResults.forEach((r) => r != null && results.push(r));
      }
      return results;
    };

    const fileResults = await runInBatches(
      uploadSession.files,
      processFile,
      CONCURRENCY,
    );
    const urlResults = await runInBatches(
      uploadSession.urls,
      processUrl,
      CONCURRENCY,
    );

    fileResults.forEach((r) => processedDocuments.push(r));
    urlResults.forEach((r) => processedDocuments.push(r));

    const totalChunks = processedDocuments.reduce(
      (s, d) => s + d.chunks.length,
      0,
    );
    return { processedDocuments, totalChunks };
  }

  /**
   * Processes training asynchronously
   *
   * @param trainingId - Training session ID
   * @param uploadSession - Upload session data
   * @param config - Training configuration
   */
  private async processTrainingAsync(
    trainingId: string,
    uploadSession: UploadSession,
    config: TrainingConfig,
  ): Promise<void> {
    try {
      // Update status to processing
      await this.updateTrainingProgress(trainingId, {
        status: "processing",
        currentStep: "extracting",
        progress: 10,
        startedAt: new Date(),
      });

      // Process documents
      const { processedDocuments, totalChunks } = await this.processDocuments(
        uploadSession,
        config,
      );

      // Update progress
      await this.updateTrainingProgress(trainingId, {
        currentStep: "chunking",
        progress: 30,
      });

      // Prepare chunks for embedding
      const allChunks = processedDocuments.flatMap((doc) =>
        doc.chunks.map((chunk: any, index: number) => ({
          id: `${doc.id}_${index}`,
          text: chunk.text,
          metadata: {
            documentId: doc.id,
            filename: doc.filename,
            chunkIndex: index,
          },
        })),
      );

      // Generate embeddings (this would be a separate service call in production)
      await this.updateTrainingProgress(trainingId, {
        currentStep: "embedding",
        progress: 60,
      });

      // Generate real embeddings using EmbeddingService
      const chunkTexts = allChunks.map((c) => c.text);
      let embeddings: number[][];
      try {
        embeddings =
          await this.embeddingService.generateBatchEmbeddings(chunkTexts);
      } catch (error) {
        throw new DatabaseError(
          `Embedding generation failed: ${(error as Error).message}`,
        );
      }

      // Store in vector database
      await this.updateTrainingProgress(trainingId, {
        currentStep: "storing",
        progress: 90,
      });

      const chatbot = await prisma.trainingSession.findUnique({
        where: { id: trainingId },
        select: { chatbotId: true },
      });

      if (chatbot) {
        await this.storeEmbeddingsInVectorDB(
          chatbot.chatbotId,
          allChunks,
          embeddings,
        );
      }

      // Complete training
      await this.completeTraining(trainingId, totalChunks);
    } catch (error) {
      console.error(`Training failed for session ${trainingId}:`, error);
      await this.failTraining(trainingId, (error as Error).message);
    }
  }

  /**
   * Stores embeddings in ChromaDB
   *
   * @param chatbotId - Chatbot ID (used as collection name)
   * @param chunks - Text chunks
   * @param embeddings - Embedding vectors
   */
  private async storeEmbeddingsInVectorDB(
    chatbotId: string,
    chunks: any[],
    embeddings: number[][],
  ): Promise<void> {
    try {
      // Create collection for this chatbot
      const collection = await this.chromaClient.getOrCreateCollection({
        name: chatbotId,
      });

      // Prepare data for ChromaDB
      const ids = chunks.map((chunk) => chunk.id);
      const documents = chunks.map((chunk) => chunk.text);
      const metadatas = chunks.map((chunk) => chunk.metadata);

      // Store in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, chunks.length);
        const batchIds = ids.slice(i, batchEnd);
        const batchDocuments = documents.slice(i, batchEnd);
        const batchEmbeddings = embeddings.slice(i, batchEnd);
        const batchMetadatas = metadatas.slice(i, batchEnd);

        await collection.add({
          ids: batchIds,
          documents: batchDocuments,
          embeddings: batchEmbeddings,
          metadatas: batchMetadatas,
        });
      }

      console.log(
        `TrainingService: Stored ${chunks.length} chunks in vector database for chatbot ${chatbotId}`,
      );
    } catch (error) {
      console.error("Failed to store embeddings:", error);
      throw new DatabaseError(
        `Vector database operation failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Updates training progress
   *
   * @param trainingId - Training session ID
   * @param updates - Progress updates
   */
  private async updateTrainingProgress(
    trainingId: string,
    updates: Partial<TrainingProgress>,
  ): Promise<void> {
    try {
      const currentSession = await prisma.trainingSession.findUnique({
        where: { id: trainingId },
      });

      if (!currentSession) return;

      const currentProgress = currentSession.progress as TrainingProgress;
      const updatedProgress = { ...currentProgress, ...updates };

      await prisma.trainingSession.update({
        where: { id: trainingId },
        data: {
          progress: updatedProgress as any,
          status: updatedProgress.status,
        },
      });

      broadcastProgress(trainingId, {
        status: updatedProgress.status,
        currentStep: updatedProgress.currentStep ?? "uploading",
        progress: updatedProgress.progress ?? 0,
        currentFile: updatedProgress.currentFile,
        errors: updatedProgress.errors ?? [],
        estimatedTimeRemaining: updatedProgress.estimatedTimeRemaining,
        startedAt: updatedProgress.startedAt?.toISOString(),
        completedAt: updatedProgress.completedAt?.toISOString(),
      });
    } catch (error) {
      console.error(
        `Failed to update training progress for ${trainingId}:`,
        error,
      );
    }
  }

  /**
   * Completes training successfully
   *
   * @param trainingId - Training session ID
   * @param totalChunks - Total number of chunks processed
   */
  private async completeTraining(
    trainingId: string,
    totalChunks: number,
  ): Promise<void> {
    try {
      const trainingSession = await prisma.trainingSession.findUnique({
        where: { id: trainingId },
        select: { chatbotId: true },
      });

      if (!trainingSession) return;

      // Update training session
      await prisma.trainingSession.update({
        where: { id: trainingId },
        data: {
          status: "completed",
          progress: {
            status: "completed",
            currentStep: "storing",
            progress: 100,
            completedAt: new Date(),
          } as any,
        },
      });

      // Update chatbot
      await prisma.chatbot.update({
        where: { id: trainingSession.chatbotId },
        data: {
          status: "ready",
          totalTokens: totalChunks * 4, // Rough estimate
        },
      });

      broadcastProgress(trainingId, {
        status: "completed",
        currentStep: "storing",
        progress: 100,
        errors: [],
        completedAt: new Date().toISOString(),
      });

      console.log(
        `TrainingService: Completed training for session ${trainingId}, chatbot ${trainingSession.chatbotId}`,
      );
    } catch (error) {
      console.error(`Failed to complete training for ${trainingId}:`, error);
    }
  }

  /**
   * Marks training as failed
   *
   * @param trainingId - Training session ID
   * @param errorMessage - Error message
   */
  private async failTraining(
    trainingId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      const trainingSession = await prisma.trainingSession.findUnique({
        where: { id: trainingId },
        select: { chatbotId: true },
      });

      if (!trainingSession) return;

      // Update training session
      await prisma.trainingSession.update({
        where: { id: trainingId },
        data: {
          status: "failed",
          progress: {
            status: "failed",
            errors: [errorMessage],
            completedAt: new Date(),
          } as any,
        },
      });

      // Update chatbot
      await prisma.chatbot.update({
        where: { id: trainingSession.chatbotId },
        data: { status: "failed" },
      });

      broadcastProgress(trainingId, {
        status: "failed",
        currentStep: "storing",
        progress: 0,
        errors: [errorMessage],
        completedAt: new Date().toISOString(),
      });

      console.log(
        `TrainingService: Failed training for session ${trainingId}, error: ${errorMessage}`,
      );
    } catch (error) {
      console.error(
        `Failed to mark training as failed for ${trainingId}:`,
        error,
      );
    }
  }

  /**
   * Estimates training time based on configuration and content
   *
   * @param config - Training configuration
   * @param documentCount - Number of documents
   * @param totalSize - Total content size in bytes
   * @returns Estimated time in milliseconds
   */
  private estimateTrainingTime(
    config: TrainingConfig,
    documentCount: number = 10,
    totalSize: number = 1024 * 1024,
  ): number {
    // Rough estimation based on empirical data
    const baseTimePerDocument = 5000; // 5 seconds per document
    const timePerMB = 2000; // 2 seconds per MB

    const documentTime = documentCount * baseTimePerDocument;
    const sizeTime = (totalSize / (1024 * 1024)) * timePerMB;

    return Math.max(documentTime + sizeTime, 30000); // Minimum 30 seconds
  }
}
