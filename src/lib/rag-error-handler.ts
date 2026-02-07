/**
 * RAG Error Handler
 *
 * Provides error handling and user-friendly messages for the RAG pipeline.
 * Implements structured error responses with actionable suggestions.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { IdkReason } from "./rag-logger";

/**
 * Error codes for RAG pipeline failures
 */
export enum ErrorCode {
  NO_COLLECTION = "NO_COLLECTION",
  EMPTY_COLLECTION = "EMPTY_COLLECTION",
  THRESHOLD_NOT_MET = "THRESHOLD_NOT_MET",
  EMBEDDING_ERROR = "EMBEDDING_ERROR",
  CHROMADB_ERROR = "CHROMADB_ERROR",
  DIMENSION_MISMATCH = "DIMENSION_MISMATCH",
  CONFIG_ERROR = "CONFIG_ERROR",
  NO_SEARCH_RESULTS = "NO_SEARCH_RESULTS",
}

/**
 * Structured error response interface
 * Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string; // Technical message for logs
  userMessage: string; // User-friendly explanation
  suggestion: string | null; // Actionable next step
  debugInfo?: any; // Additional context (debug mode only)
}

/**
 * Error message templates for all error codes
 * Requirement 6.1, 6.3, 6.4
 */
const ERROR_MESSAGE_TEMPLATES: Record<
  ErrorCode,
  {
    userMessage: string;
    suggestion: string;
  }
> = {
  [ErrorCode.NO_COLLECTION]: {
    userMessage:
      "No documents have been uploaded yet. Please upload and train documents first.",
    suggestion: "Upload documents using the training interface",
  },
  [ErrorCode.EMPTY_COLLECTION]: {
    userMessage:
      "Your document collection is empty. Please re-train your chatbot.",
    suggestion:
      "Try uploading documents again or contact support if the issue persists",
  },
  [ErrorCode.THRESHOLD_NOT_MET]: {
    userMessage: "I don't know",
    suggestion:
      "Try rephrasing your question or asking about topics covered in your documents",
  },
  [ErrorCode.EMBEDDING_ERROR]: {
    userMessage:
      "Unable to process your query due to a temporary service issue.",
    suggestion: "Please try again in a moment",
  },
  [ErrorCode.CHROMADB_ERROR]: {
    userMessage: "Unable to search your documents due to a database issue.",
    suggestion: "Please try again or contact support if the issue persists",
  },
  [ErrorCode.DIMENSION_MISMATCH]: {
    userMessage:
      "There is a configuration mismatch in your chatbot. Please re-train it.",
    suggestion: "Re-train your chatbot to fix the embedding configuration",
  },
  [ErrorCode.CONFIG_ERROR]: {
    userMessage: "The chatbot configuration is invalid.",
    suggestion: "Please check your configuration or contact support",
  },
  [ErrorCode.NO_SEARCH_RESULTS]: {
    userMessage: "I don't know",
    suggestion: "Try rephrasing your question or asking about different topics",
  },
};

/**
 * RAG Error Handler class
 * Provides methods to create user-friendly error responses
 */
export class RagErrorHandler {
  /**
   * Handles "I don't know" responses with reason-specific messages
   * Requirement 6.2, 6.5
   *
   * @param reason - The reason for the IDK response
   * @param details - Additional details about the error
   * @param debugMode - Whether to include debug information
   * @returns Structured error response
   */
  handleIdkResponse(
    reason: IdkReason,
    details: any,
    debugMode: boolean = false,
  ): ErrorResponse {
    let errorCode: ErrorCode;

    // Map IdkReason to ErrorCode
    switch (reason) {
      case IdkReason.NO_COLLECTION:
        errorCode = ErrorCode.NO_COLLECTION;
        break;
      case IdkReason.EMPTY_COLLECTION:
        errorCode = ErrorCode.EMPTY_COLLECTION;
        break;
      case IdkReason.THRESHOLD_NOT_MET:
        errorCode = ErrorCode.THRESHOLD_NOT_MET;
        break;
      case IdkReason.NO_SEARCH_RESULTS:
        errorCode = ErrorCode.NO_SEARCH_RESULTS;
        break;
      case IdkReason.EMBEDDING_ERROR:
        errorCode = ErrorCode.EMBEDDING_ERROR;
        break;
      case IdkReason.CHROMADB_ERROR:
        errorCode = ErrorCode.CHROMADB_ERROR;
        break;
      default:
        errorCode = ErrorCode.CONFIG_ERROR;
    }

    return this.createErrorResponse(errorCode, details, debugMode);
  }

  /**
   * Creates a structured error response for a given error code
   * Requirement 6.1, 6.3, 6.4, 6.6
   *
   * @param errorCode - The error code
   * @param details - Additional details about the error
   * @param debugMode - Whether to include debug information
   * @returns Structured error response
   */
  createErrorResponse(
    errorCode: ErrorCode,
    details: any = {},
    debugMode: boolean = false,
  ): ErrorResponse {
    const template = ERROR_MESSAGE_TEMPLATES[errorCode];

    // Build technical message based on error code and details
    let technicalMessage = this.buildTechnicalMessage(errorCode, details);

    const response: ErrorResponse = {
      code: errorCode,
      message: technicalMessage,
      userMessage: template.userMessage,
      suggestion: template.suggestion,
    };

    // Include debug info if debug mode is enabled
    // Requirement 6.5
    if (debugMode) {
      response.debugInfo = this.buildDebugInfo(errorCode, details);
    }

    return response;
  }

  /**
   * Builds a technical message for logging
   *
   * @param errorCode - The error code
   * @param details - Additional details
   * @returns Technical message string
   */
  private buildTechnicalMessage(errorCode: ErrorCode, details: any): string {
    switch (errorCode) {
      case ErrorCode.NO_COLLECTION:
        return `Collection does not exist for project ${details.projectId || "unknown"}`;

      case ErrorCode.EMPTY_COLLECTION:
        return `Collection exists but contains no documents for project ${details.projectId || "unknown"}`;

      case ErrorCode.THRESHOLD_NOT_MET:
        return `Highest similarity score ${details.highestScore?.toFixed(4) || "N/A"} below threshold ${details.threshold?.toFixed(4) || "N/A"}`;

      case ErrorCode.EMBEDDING_ERROR:
        return `Embedding generation failed: ${details.error || "Unknown error"}`;

      case ErrorCode.CHROMADB_ERROR:
        return `ChromaDB operation failed: ${details.error || "Unknown error"}`;

      case ErrorCode.DIMENSION_MISMATCH:
        return `Expected ${details.expected || "N/A"} dimensions, got ${details.actual || "N/A"}`;

      case ErrorCode.CONFIG_ERROR:
        return `Configuration error: ${details.error || "Unknown error"}`;

      case ErrorCode.NO_SEARCH_RESULTS:
        return `Similarity search returned no results for project ${details.projectId || "unknown"}`;

      default:
        return `Unknown error: ${errorCode}`;
    }
  }

  /**
   * Builds debug information for error responses
   * Requirement 6.5
   *
   * @param errorCode - The error code
   * @param details - Additional details
   * @returns Debug information object
   */
  private buildDebugInfo(errorCode: ErrorCode, details: any): any {
    const debugInfo: any = {
      errorCode,
      timestamp: new Date().toISOString(),
    };

    // Add error-specific debug information
    switch (errorCode) {
      case ErrorCode.THRESHOLD_NOT_MET:
        debugInfo.highestScore = details.highestScore;
        debugInfo.threshold = details.threshold;
        debugInfo.margin = details.margin;
        debugInfo.recommendation = details.recommendation;
        break;

      case ErrorCode.DIMENSION_MISMATCH:
        debugInfo.expectedDimensions = details.expected;
        debugInfo.actualDimensions = details.actual;
        break;

      case ErrorCode.NO_COLLECTION:
      case ErrorCode.EMPTY_COLLECTION:
        debugInfo.projectId = details.projectId;
        debugInfo.collectionName = details.collectionName;
        break;

      case ErrorCode.EMBEDDING_ERROR:
      case ErrorCode.CHROMADB_ERROR:
        debugInfo.error = details.error;
        debugInfo.retryCount = details.retryCount;
        break;

      case ErrorCode.NO_SEARCH_RESULTS:
        debugInfo.projectId = details.projectId;
        debugInfo.queryLength = details.queryLength;
        break;
    }

    return debugInfo;
  }

  /**
   * Creates an error response from a generic error object
   * Requirement 6.1, 6.3, 6.4
   *
   * @param error - The error object
   * @param debugMode - Whether to include debug information
   * @returns Structured error response
   */
  createErrorFromException(
    error: any,
    debugMode: boolean = false,
  ): ErrorResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to detect error type from message
    if (errorMessage.includes("NO_COLLECTION")) {
      return this.createErrorResponse(
        ErrorCode.NO_COLLECTION,
        { error: errorMessage },
        debugMode,
      );
    } else if (errorMessage.includes("EMPTY_COLLECTION")) {
      return this.createErrorResponse(
        ErrorCode.EMPTY_COLLECTION,
        { error: errorMessage },
        debugMode,
      );
    } else if (errorMessage.includes("DIMENSION_MISMATCH")) {
      // Extract dimensions from error message if possible
      const match = errorMessage.match(/Expected (\d+).*got (\d+)/);
      const details = match
        ? { expected: parseInt(match[1]), actual: parseInt(match[2]) }
        : { error: errorMessage };
      return this.createErrorResponse(
        ErrorCode.DIMENSION_MISMATCH,
        details,
        debugMode,
      );
    } else if (errorMessage.includes("CHROMADB_ERROR")) {
      return this.createErrorResponse(
        ErrorCode.CHROMADB_ERROR,
        { error: errorMessage },
        debugMode,
      );
    } else if (
      errorMessage.includes("embedding") ||
      errorMessage.includes("EMBEDDING_ERROR")
    ) {
      return this.createErrorResponse(
        ErrorCode.EMBEDDING_ERROR,
        { error: errorMessage },
        debugMode,
      );
    }

    // Default to config error for unknown errors
    return this.createErrorResponse(
      ErrorCode.CONFIG_ERROR,
      { error: errorMessage },
      debugMode,
    );
  }

  /**
   * Validates that an error response has all required fields
   * Requirement 6.6
   *
   * @param errorResponse - The error response to validate
   * @returns True if valid, false otherwise
   */
  validateErrorResponse(errorResponse: ErrorResponse): boolean {
    return !!(
      errorResponse.code &&
      errorResponse.message &&
      errorResponse.userMessage &&
      errorResponse.suggestion !== undefined
    );
  }
}
