/**
 * Upload Session Management
 * Handles temporary storage and cleanup of upload sessions
 */

import { FileValidationResult, UrlValidationResult } from "./upload-validation";
import { ValidationError } from "./errors";

// Upload session configuration
const UPLOAD_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SESSIONS_PER_USER = 10; // Prevent abuse

// In-memory storage for upload sessions (in production, use Redis/database)
const uploadSessions = new Map<string, UploadSession>();

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (now - session.createdAt > UPLOAD_SESSION_TTL) {
      uploadSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export interface ValidatedFile {
  id: string;
  file: File;
  status: "pending" | "validating" | "ready" | "failed";
  validationErrors: string[];
  metadata: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
    detectedType?: string;
  };
}

export interface ValidatedUrl {
  id: string;
  url: string;
  status: "pending" | "validating" | "ready" | "failed";
  validationErrors: string[];
  metadata?: {
    contentType?: string;
    contentLength?: number;
    title?: string;
  };
}

export interface UploadSession {
  id: string;
  userId: string; // For future multi-user support
  createdAt: number;
  expiresAt: number;
  status: "active" | "completed" | "expired";
  files: ValidatedFile[];
  urls: ValidatedUrl[];
  totalSize: number;
  errorCount: number;
}

/**
 * Creates a new upload session
 */
export function createUploadSession(userId: string = "default"): UploadSession {
  // Clean up old sessions for this user
  cleanupUserSessions(userId);

  const sessionId = generateSessionId();
  const now = Date.now();

  const session: UploadSession = {
    id: sessionId,
    userId,
    createdAt: now,
    expiresAt: now + UPLOAD_SESSION_TTL,
    status: "active",
    files: [],
    urls: [],
    totalSize: 0,
    errorCount: 0
  };

  uploadSessions.set(sessionId, session);
  return session;
}

/**
 * Gets an upload session by ID
 */
export function getUploadSession(sessionId: string): UploadSession | null {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    session.status = "expired";
    uploadSessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Adds validated files to an upload session
 */
export function addValidatedFiles(sessionId: string, validatedFiles: ValidatedFile[]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new ValidationError("Upload session not found");
  }

  if (session.status !== "active") {
    throw new ValidationError("Upload session is not active");
  }

  // Add files to session
  session.files.push(...validatedFiles);

  // Update session statistics
  session.totalSize += validatedFiles.reduce((sum, file) => sum + file.metadata.size, 0);
  session.errorCount += validatedFiles.filter(file => file.status === "failed").length;

  uploadSessions.set(sessionId, session);
  return session;
}

/**
 * Adds validated URLs to an upload session
 */
export function addValidatedUrls(sessionId: string, validatedUrls: ValidatedUrl[]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new ValidationError("Upload session not found");
  }

  if (session.status !== "active") {
    throw new ValidationError("Upload session is not active");
  }

  // Add URLs to session
  session.urls.push(...validatedUrls);

  // Update session statistics
  session.errorCount += validatedUrls.filter(url => url.status === "failed").length;

  uploadSessions.set(sessionId, session);
  return session;
}

/**
 * Updates the status of an upload session
 */
export function updateSessionStatus(sessionId: string, status: UploadSession["status"]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new ValidationError("Upload session not found");
  }

  session.status = status;
  uploadSessions.set(sessionId, session);

  return session;
}

/**
 * Removes files from an upload session
 */
export function removeFilesFromSession(sessionId: string, fileIds: string[]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new ValidationError("Upload session not found");
  }

  if (session.status !== "active") {
    throw new ValidationError("Upload session is not active");
  }

  // Remove files
  const removedFiles = session.files.filter(file => fileIds.includes(file.id));
  session.files = session.files.filter(file => !fileIds.includes(file.id));

  // Update statistics
  session.totalSize -= removedFiles.reduce((sum, file) => sum + file.metadata.size, 0);
  session.errorCount -= removedFiles.filter(file => file.status === "failed").length;

  uploadSessions.set(sessionId, session);
  return session;
}

/**
 * Removes URLs from an upload session
 */
export function removeUrlsFromSession(sessionId: string, urlIds: string[]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new ValidationError("Upload session not found");
  }

  if (session.status !== "active") {
    throw new ValidationError("Upload session is not active");
  }

  // Remove URLs
  const removedUrls = session.urls.filter(url => urlIds.includes(url.id));
  session.urls = session.urls.filter(url => !urlIds.includes(url.id));

  // Update statistics
  session.errorCount -= removedUrls.filter(url => url.status === "failed").length;

  uploadSessions.set(sessionId, session);
  return session;
}

/**
 * Cleans up an upload session and removes temporary files
 */
export function cleanupUploadSession(sessionId: string): void {
  const session = uploadSessions.get(sessionId);

  if (session) {
    // In a production environment, you would clean up any temporary files here
    // For now, just remove from memory
    uploadSessions.delete(sessionId);
  }
}

/**
 * Gets all active sessions for a user
 */
export function getUserSessions(userId: string = "default"): UploadSession[] {
  const userSessions: UploadSession[] = [];

  for (const session of uploadSessions.values()) {
    if (session.userId === userId && session.status === "active") {
      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        session.status = "expired";
        uploadSessions.delete(session.id);
      } else {
        userSessions.push(session);
      }
    }
  }

  return userSessions;
}

/**
 * Cleans up old sessions for a user to prevent abuse
 */
function cleanupUserSessions(userId: string): void {
  const userSessions = getUserSessions(userId);

  if (userSessions.length >= MAX_SESSIONS_PER_USER) {
    // Sort by creation time and keep only the most recent ones
    userSessions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(MAX_SESSIONS_PER_USER)
      .forEach(session => {
        cleanupUploadSession(session.id);
      });
  }
}

/**
 * Generates a unique session ID
 */
function generateSessionId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Updates the status of an upload session
 */
export function updateSessionStatus(sessionId: string, status: UploadSession["status"]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    active: ["completed"],
    completed: [], // Terminal state
    expired: [] // Terminal state
  };

  if (!validTransitions[session.status]?.includes(status)) {
    throw new Error(`Invalid status transition from ${session.status} to ${status}`);
  }

  session.status = status;
  uploadSessions.set(sessionId, session);

  return session;
}

/**
 * Updates the status of multiple files in a session
 */
export function updateFileStatus(
  sessionId: string,
  fileIds: string[],
  status: ValidatedFile["status"]
): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  session.files = session.files.map(file => {
    if (fileIds.includes(file.id)) {
      return { ...file, status };
    }
    return file;
  });

  // Recalculate error count
  session.errorCount = session.files.filter(f => f.status === "failed").length +
                      session.urls.filter(u => u.status === "failed").length;

  uploadSessions.set(sessionId, session);

  return session;
}

/**
 * Updates the status of multiple URLs in a session
 */
export function updateUrlStatus(
  sessionId: string,
  urlIds: string[],
  status: ValidatedUrl["status"]
): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  session.urls = session.urls.map(url => {
    if (urlIds.includes(url.id)) {
      return { ...url, status };
    }
    return url;
  });

  // Recalculate error count
  session.errorCount = session.files.filter(f => f.status === "failed").length +
                      session.urls.filter(u => u.status === "failed").length;

  uploadSessions.set(sessionId, session);

  return session;
}

/**
 * Gets session statistics
 */
export function getSessionStats(userId?: string): {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  totalSize: number;
} {
  let totalSessions = 0;
  let activeSessions = 0;
  let expiredSessions = 0;
  let totalSize = 0;

  const now = Date.now();

  for (const session of uploadSessions.values()) {
    // Filter by user if specified
    if (userId && session.userId !== userId) {
      continue;
    }

    totalSessions++;

    if (now > session.expiresAt) {
      expiredSessions++;
    } else if (session.status === "active") {
      activeSessions++;
      totalSize += session.totalSize;
    }
  }

  return {
    totalSessions,
    activeSessions,
    expiredSessions,
    totalSize
  };
}

/**
 * Removes specific files from a session
 */
export function removeFilesFromSession(sessionId: string, fileIds: string[]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  if (session.status !== "active") {
    throw new Error("Cannot modify completed or expired sessions");
  }

  const filesToRemove = session.files.filter(file => fileIds.includes(file.id));
  session.files = session.files.filter(file => !fileIds.includes(file.id));

  // Update session statistics
  session.totalSize -= filesToRemove.reduce((sum, file) => sum + file.metadata.size, 0);
  session.errorCount -= filesToRemove.filter(file => file.status === "failed").length;

  uploadSessions.set(sessionId, session);

  return session;
}

/**
 * Removes specific URLs from a session
 */
export function removeUrlsFromSession(sessionId: string, urlIds: string[]): UploadSession {
  const session = uploadSessions.get(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  if (session.status !== "active") {
    throw new Error("Cannot modify completed or expired sessions");
  }

  const urlsToRemove = session.urls.filter(url => urlIds.includes(url.id));
  session.urls = session.urls.filter(url => !urlIds.includes(url.id));

  // Update session statistics
  session.errorCount -= urlsToRemove.filter(url => url.status === "failed").length;

  uploadSessions.set(sessionId, session);

  return session;
}