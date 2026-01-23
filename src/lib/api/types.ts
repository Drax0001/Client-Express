/**
 * API Types - TypeScript interfaces for backend API responses
 * Matches the backend schemas defined in the RAG chatbot system
 */

// ======================================
// PROJECT TYPES
// ======================================

/**
 * Project entity from database
 */
export interface Project {
  id: string
  name: string
  createdAt: string
  documentCount: number
}

/**
 * Project creation request
 */
export interface CreateProjectRequest {
  name: string
}

/**
 * Project creation response
 */
export interface CreateProjectResponse {
  id: string
  name: string
  createdAt: string
}

/**
 * Get project response (includes document count)
 */
export interface GetProjectResponse {
  id: string
  name: string
  createdAt: string
  documentCount: number
}

/**
 * Project deletion response
 */
export interface DeleteProjectResponse {
  message: string
}

// ======================================
// DOCUMENT TYPES
// ======================================

/**
 * Document status enum
 */
export type DocumentStatus = "pending" | "processing" | "ready" | "failed"

/**
 * Document entity from database
 */
export interface Document {
  id: string
  projectId: string
  filename: string
  fileType: "pdf" | "docx" | "txt" | "url"
  status: DocumentStatus
  uploadedAt: string
  errorMessage?: string
}

/**
 * Document upload request (multipart form data)
 */
export interface UploadDocumentRequest {
  projectId: string
  file?: File
  url?: string
}

/**
 * Document upload response
 */
export interface UploadDocumentResponse {
  id: string
  projectId: string
  filename: string
  fileType: "pdf" | "docx" | "txt" | "url"
  status: DocumentStatus
  uploadedAt: string
  errorMessage?: string
}

// ======================================
// CHAT TYPES
// ======================================

/**
 * Chat query request
 */
export interface ChatRequest {
  projectId: string
  message: string
}

/**
 * Chat response
 */
export interface ChatResponse {
  answer: string
  sourceCount: number
}

// ======================================
// ERROR TYPES
// ======================================

/**
 * API Error response structure
 */
export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ======================================
// TYPE GUARDS
// ======================================

/**
 * Type guard for DocumentStatus
 */
export function isDocumentStatus(status: string): status is DocumentStatus {
  return ["pending", "processing", "ready", "failed"].includes(status)
}

/**
 * Type guard for Document fileType
 */
export function isDocumentFileType(type: string): type is Document["fileType"] {
  return ["pdf", "docx", "txt", "url"].includes(type)
}

/**
 * Type guard for API Error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as any).error === "object" &&
    (error as any).error !== null &&
    "code" in (error as any).error &&
    "message" in (error as any).error
  )
}

// ======================================
// QUERY KEYS
// ======================================

/**
 * TanStack Query keys for consistent cache management
 */
export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  documents: (projectId: string) => ["documents", projectId] as const,
  chat: (projectId: string) => ["chat", projectId] as const,
}

// ======================================
// MUTATION KEYS
// ======================================

/**
 * Mutation identifiers for optimistic updates
 */
export const mutationKeys = {
  createProject: "createProject",
  deleteProject: "deleteProject",
  uploadDocument: "uploadDocument",
  sendChatMessage: "sendChatMessage",
} as const