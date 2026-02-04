/**
 * UploadService - Manages file and URL upload sessions
 * Handles validation, temporary storage, and session lifecycle
 */

import {
  validateFiles,
  validateUrls,
  createUploadSession,
  getUploadSession,
  addValidatedFiles,
  addValidatedUrls,
  cleanupUploadSession,
  ValidatedFile,
  ValidatedUrl,
  UploadSession
} from "../lib/upload-validation";
import { ValidationError, NotFoundError } from "../lib/errors";

export interface UploadServiceConfig {
  maxFilesPerSession?: number;
  maxUrlsPerSession?: number;
  sessionTimeoutMs?: number;
}

export class UploadService {
  private config: Required<UploadServiceConfig>;

  constructor(config: UploadServiceConfig = {}) {
    this.config = {
      maxFilesPerSession: config.maxFilesPerSession ?? 50,
      maxUrlsPerSession: config.maxUrlsPerSession ?? 20,
      sessionTimeoutMs: config.sessionTimeoutMs ?? 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  /**
   * Validates and stores files for an upload session
   * Creates a new session if sessionId is not provided
   *
   * @param files - Array of File objects to validate
   * @param sessionId - Optional existing session ID
   * @param userId - User identifier (for future multi-user support)
   * @returns UploadSession with validated files
   * @throws ValidationError if validation fails
   */
  async validateAndStoreFiles(
    files: File[],
    sessionId?: string,
    userId: string = "default"
  ): Promise<UploadSession> {
    // Validate file count limits
    if (files.length > this.config.maxFilesPerSession) {
      throw new ValidationError(
        `Too many files. Maximum ${this.config.maxFilesPerSession} files per session.`
      );
    }

    // Get or create session
    let session: UploadSession;
    if (sessionId) {
      session = getUploadSession(sessionId);
      if (!session) {
        throw new NotFoundError("Upload session not found or expired");
      }
      if (session.status !== "active") {
        throw new ValidationError("Upload session is not active");
      }
    } else {
      session = createUploadSession(userId);
    }

    // Validate files
    const validationResult = validateFiles(files);

    if (validationResult.validFiles.length === 0) {
      throw new ValidationError("No valid files provided");
    }

    // Check session limits
    const totalFilesInSession = session.files.length + validationResult.validFiles.length;
    if (totalFilesInSession > this.config.maxFilesPerSession) {
      throw new ValidationError(
        `Session would exceed maximum file limit of ${this.config.maxFilesPerSession}`
      );
    }

    // Convert validated files to session format
    const validatedFiles: ValidatedFile[] = validationResult.validFiles.map((file, index) => ({
      id: `file_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: "ready" as const,
      validationErrors: [],
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        detectedType: file.name.split('.').pop()?.toLowerCase()
      }
    }));

    // Add files to session
    const updatedSession = addValidatedFiles(session.id, validatedFiles);

    console.log(`UploadService: Added ${validatedFiles.length} files to session ${session.id}`);

    return updatedSession;
  }

  /**
   * Validates and stores URLs for an upload session
   * Creates a new session if sessionId is not provided
   *
   * @param urls - Array of URL strings to validate
   * @param sessionId - Optional existing session ID
   * @param userId - User identifier (for future multi-user support)
   * @returns UploadSession with validated URLs
   * @throws ValidationError if validation fails
   */
  async validateAndStoreUrls(
    urls: string[],
    sessionId?: string,
    userId: string = "default"
  ): Promise<UploadSession> {
    // Validate URL count limits
    if (urls.length > this.config.maxUrlsPerSession) {
      throw new ValidationError(
        `Too many URLs. Maximum ${this.config.maxUrlsPerSession} URLs per session.`
      );
    }

    // Get or create session
    let session: UploadSession;
    if (sessionId) {
      session = getUploadSession(sessionId);
      if (!session) {
        throw new NotFoundError("Upload session not found or expired");
      }
      if (session.status !== "active") {
        throw new ValidationError("Upload session is not active");
      }
    } else {
      session = createUploadSession(userId);
    }

    // Validate URLs
    const validationResult = validateUrls(urls);

    if (validationResult.validUrls.length === 0) {
      throw new ValidationError("No valid URLs provided");
    }

    // Check session limits
    const totalUrlsInSession = session.urls.length + validationResult.validUrls.length;
    if (totalUrlsInSession > this.config.maxUrlsPerSession) {
      throw new ValidationError(
        `Session would exceed maximum URL limit of ${this.config.maxUrlsPerSession}`
      );
    }

    // Convert validated URLs to session format
    const validatedUrls: ValidatedUrl[] = validationResult.validUrls.map((url, index) => ({
      id: `url_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      url,
      status: "ready" as const,
      validationErrors: []
    }));

    // Add URLs to session
    const updatedSession = addValidatedUrls(session.id, validatedUrls);

    console.log(`UploadService: Added ${validatedUrls.length} URLs to session ${session.id}`);

    return updatedSession;
  }

  /**
   * Creates a new upload session
   *
   * @param userId - User identifier
   * @returns New UploadSession
   */
  createUploadSession(userId: string = "default"): UploadSession {
    return createUploadSession(userId);
  }

  /**
   * Retrieves an upload session by ID
   *
   * @param sessionId - Session ID to retrieve
   * @returns UploadSession or null if not found
   */
  getUploadSession(sessionId: string): UploadSession | null {
    return getUploadSession(sessionId);
  }

  /**
   * Updates the status of an upload session
   *
   * @param sessionId - Session ID
   * @param status - New status
   * @returns Updated UploadSession
   * @throws NotFoundError if session not found
   * @throws ValidationError if status transition is invalid
   */
  updateSessionStatus(
    sessionId: string,
    status: UploadSession["status"]
  ): UploadSession {
    const session = getUploadSession(sessionId);
    if (!session) {
      throw new NotFoundError("Upload session not found");
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      active: ["completed"],
      completed: [], // Terminal state
      expired: [] // Terminal state
    };

    if (!validTransitions[session.status]?.includes(status)) {
      throw new ValidationError(
        `Invalid status transition from ${session.status} to ${status}`
      );
    }

    // Note: This function doesn't exist in our current implementation
    // We'll need to add it to upload-session.ts
    throw new Error("updateSessionStatus not yet implemented");
  }

  /**
   * Removes files from an upload session
   *
   * @param sessionId - Session ID
   * @param fileIds - Array of file IDs to remove
   * @returns Updated UploadSession
   * @throws NotFoundError if session not found
   * @throws ValidationError if session is not active
   */
  removeFilesFromSession(sessionId: string, fileIds: string[]): UploadSession {
    const session = getUploadSession(sessionId);
    if (!session) {
      throw new NotFoundError("Upload session not found");
    }

    if (session.status !== "active") {
      throw new ValidationError("Cannot modify completed or expired sessions");
    }

    // Note: This function doesn't exist in our current implementation
    // We'll need to add it to upload-session.ts
    throw new Error("removeFilesFromSession not yet implemented");
  }

  /**
   * Removes URLs from an upload session
   *
   * @param sessionId - Session ID
   * @param urlIds - Array of URL IDs to remove
   * @returns Updated UploadSession
   * @throws NotFoundError if session not found
   * @throws ValidationError if session is not active
   */
  removeUrlsFromSession(sessionId: string, urlIds: string[]): UploadSession {
    const session = getUploadSession(sessionId);
    if (!session) {
      throw new NotFoundError("Upload session not found");
    }

    if (session.status !== "active") {
      throw new ValidationError("Cannot modify completed or expired sessions");
    }

    // Note: This function doesn't exist in our current implementation
    // We'll need to add it to upload-session.ts
    throw new Error("removeUrlsFromSession not yet implemented");
  }

  /**
   * Cleans up an upload session and removes temporary data
   *
   * @param sessionId - Session ID to clean up
   */
  cleanupUploadSession(sessionId: string): void {
    cleanupUploadSession(sessionId);
    console.log(`UploadService: Cleaned up session ${sessionId}`);
  }

  /**
   * Gets statistics about upload sessions
   *
   * @param userId - Optional user ID to filter sessions
   * @returns Session statistics
   */
  getSessionStats(userId?: string) {
    // Note: This function doesn't exist in our current implementation
    // We'll need to add it to upload-session.ts
    throw new Error("getSessionStats not yet implemented");
  }

  /**
   * Validates that an upload session is ready for training
   *
   * @param sessionId - Session ID to validate
   * @returns Validation result with any issues
   */
  validateSessionForTraining(sessionId: string): {
    isValid: boolean;
    issues: string[];
    totalFiles: number;
    totalUrls: number;
    totalSize: number;
  } {
    const session = getUploadSession(sessionId);
    if (!session) {
      return {
        isValid: false,
        issues: ["Upload session not found or expired"],
        totalFiles: 0,
        totalUrls: 0,
        totalSize: 0
      };
    }

    const issues: string[] = [];

    // Check session status
    if (session.status !== "active") {
      issues.push(`Session status is ${session.status}, expected active`);
    }

    // Check if session has content
    if (session.files.length === 0 && session.urls.length === 0) {
      issues.push("Session contains no files or URLs");
    }

    // Check for validation errors
    const filesWithErrors = session.files.filter(f => f.status === "failed" || f.validationErrors.length > 0);
    if (filesWithErrors.length > 0) {
      issues.push(`${filesWithErrors.length} files have validation errors`);
    }

    const urlsWithErrors = session.urls.filter(u => u.status === "failed" || u.validationErrors.length > 0);
    if (urlsWithErrors.length > 0) {
      issues.push(`${urlsWithErrors.length} URLs have validation errors`);
    }

    // Check size limits
    const maxTotalSize = 100 * 1024 * 1024; // 100MB total limit
    if (session.totalSize > maxTotalSize) {
      issues.push(`Total session size (${Math.round(session.totalSize / 1024 / 1024)}MB) exceeds limit of ${maxTotalSize / 1024 / 1024}MB`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalFiles: session.files.filter(f => f.status === "ready").length,
      totalUrls: session.urls.filter(u => u.status === "ready").length,
      totalSize: session.totalSize
    };
  }
}