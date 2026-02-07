/**
 * Unit tests for RAG Error Handler
 * Tests error message formatting, actionability, and debug mode
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, it, expect } from "vitest";
import {
  RagErrorHandler,
  ErrorCode,
  ErrorResponse,
} from "../rag-error-handler";
import { IdkReason } from "../rag-logger";

describe("RagErrorHandler", () => {
  const errorHandler = new RagErrorHandler();

  describe("Error Message Templates", () => {
    /**
     * Test NO_COLLECTION error message format
     * Requirement 6.1
     */
    it("should return specific error message for NO_COLLECTION", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.NO_COLLECTION,
        { projectId: "test-project" },
        false,
      );

      expect(response.code).toBe(ErrorCode.NO_COLLECTION);
      expect(response.userMessage).toBe(
        "No documents have been uploaded yet. Please upload and train documents first.",
      );
      expect(response.suggestion).toBe(
        "Upload documents using the training interface",
      );
      expect(response.message).toContain("Collection does not exist");
    });

    /**
     * Test EMPTY_COLLECTION error message format
     * Requirement 6.1
     */
    it("should return specific error message for EMPTY_COLLECTION", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.EMPTY_COLLECTION,
        { projectId: "test-project" },
        false,
      );

      expect(response.code).toBe(ErrorCode.EMPTY_COLLECTION);
      expect(response.userMessage).toBe(
        "Your document collection is empty. Please re-train your chatbot.",
      );
      expect(response.suggestion).toBe(
        "Try uploading documents again or contact support if the issue persists",
      );
      expect(response.message).toContain("contains no documents");
    });

    /**
     * Test THRESHOLD_NOT_MET error message format
     * Requirement 6.2
     */
    it("should return specific error message for THRESHOLD_NOT_MET", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.THRESHOLD_NOT_MET,
        {
          highestScore: 0.32,
          threshold: 0.4,
          margin: -0.08,
        },
        false,
      );

      expect(response.code).toBe(ErrorCode.THRESHOLD_NOT_MET);
      expect(response.userMessage).toBe("I don't know");
      expect(response.suggestion).toContain("Try rephrasing your question");
      expect(response.message).toContain("0.3200");
      expect(response.message).toContain("0.4000");
    });

    /**
     * Test EMBEDDING_ERROR error message format
     * Requirement 6.3
     */
    it("should return specific error message for EMBEDDING_ERROR", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.EMBEDDING_ERROR,
        { error: "API timeout" },
        false,
      );

      expect(response.code).toBe(ErrorCode.EMBEDDING_ERROR);
      expect(response.userMessage).toBe(
        "Unable to process your query due to a temporary service issue.",
      );
      expect(response.suggestion).toBe("Please try again in a moment");
      expect(response.message).toContain("Embedding generation failed");
    });

    /**
     * Test CHROMADB_ERROR error message format
     * Requirement 6.4
     */
    it("should return specific error message for CHROMADB_ERROR", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.CHROMADB_ERROR,
        { error: "Connection refused" },
        false,
      );

      expect(response.code).toBe(ErrorCode.CHROMADB_ERROR);
      expect(response.userMessage).toBe(
        "Unable to search your documents due to a database issue.",
      );
      expect(response.suggestion).toBe(
        "Please try again or contact support if the issue persists",
      );
      expect(response.message).toContain("ChromaDB operation failed");
    });

    /**
     * Test DIMENSION_MISMATCH error message format
     * Requirement 6.1
     */
    it("should return specific error message for DIMENSION_MISMATCH", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.DIMENSION_MISMATCH,
        { expected: 768, actual: 1536 },
        false,
      );

      expect(response.code).toBe(ErrorCode.DIMENSION_MISMATCH);
      expect(response.userMessage).toBe(
        "There is a configuration mismatch in your chatbot. Please re-train it.",
      );
      expect(response.suggestion).toBe(
        "Re-train your chatbot to fix the embedding configuration",
      );
      expect(response.message).toContain("Expected 768");
      expect(response.message).toContain("got 1536");
    });

    /**
     * Test NO_SEARCH_RESULTS error message format
     * Requirement 6.1
     */
    it("should return specific error message for NO_SEARCH_RESULTS", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.NO_SEARCH_RESULTS,
        { projectId: "test-project" },
        false,
      );

      expect(response.code).toBe(ErrorCode.NO_SEARCH_RESULTS);
      expect(response.userMessage).toBe("I don't know");
      expect(response.suggestion).toContain("Try rephrasing your question");
    });
  });

  describe("Error Message Actionability", () => {
    /**
     * Test that all error messages include actionable suggestions
     * Requirement 6.6
     */
    it("should include actionable suggestions in all error responses", () => {
      const errorCodes = [
        ErrorCode.NO_COLLECTION,
        ErrorCode.EMPTY_COLLECTION,
        ErrorCode.THRESHOLD_NOT_MET,
        ErrorCode.EMBEDDING_ERROR,
        ErrorCode.CHROMADB_ERROR,
        ErrorCode.DIMENSION_MISMATCH,
        ErrorCode.NO_SEARCH_RESULTS,
      ];

      errorCodes.forEach((errorCode) => {
        const response = errorHandler.createErrorResponse(errorCode, {}, false);

        expect(response.suggestion).toBeDefined();
        expect(response.suggestion).not.toBe("");
        expect(typeof response.suggestion).toBe("string");
      });
    });

    /**
     * Test that suggestions are actionable (contain verbs)
     * Requirement 6.6
     */
    it("should provide actionable suggestions with action verbs", () => {
      const actionVerbs = [
        "upload",
        "try",
        "re-train",
        "check",
        "contact",
        "rephrase",
      ];

      const errorCodes = [
        ErrorCode.NO_COLLECTION,
        ErrorCode.EMPTY_COLLECTION,
        ErrorCode.THRESHOLD_NOT_MET,
        ErrorCode.EMBEDDING_ERROR,
        ErrorCode.CHROMADB_ERROR,
        ErrorCode.DIMENSION_MISMATCH,
      ];

      errorCodes.forEach((errorCode) => {
        const response = errorHandler.createErrorResponse(errorCode, {}, false);

        const hasActionVerb = actionVerbs.some((verb) =>
          response.suggestion!.toLowerCase().includes(verb),
        );

        expect(hasActionVerb).toBe(true);
      });
    });
  });

  describe("Debug Mode", () => {
    /**
     * Test that debug info is included when debug mode is enabled
     * Requirement 6.5
     */
    it("should include debug info when debug mode is enabled", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.THRESHOLD_NOT_MET,
        {
          highestScore: 0.35,
          threshold: 0.4,
          margin: -0.05,
        },
        true, // debug mode enabled
      );

      expect(response.debugInfo).toBeDefined();
      expect(response.debugInfo.errorCode).toBe(ErrorCode.THRESHOLD_NOT_MET);
      expect(response.debugInfo.highestScore).toBe(0.35);
      expect(response.debugInfo.threshold).toBe(0.4);
      expect(response.debugInfo.margin).toBe(-0.05);
      expect(response.debugInfo.timestamp).toBeDefined();
    });

    /**
     * Test that debug info is NOT included when debug mode is disabled
     * Requirement 6.5
     */
    it("should NOT include debug info when debug mode is disabled", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.THRESHOLD_NOT_MET,
        {
          highestScore: 0.35,
          threshold: 0.4,
        },
        false, // debug mode disabled
      );

      expect(response.debugInfo).toBeUndefined();
    });

    /**
     * Test debug info for DIMENSION_MISMATCH
     * Requirement 6.5
     */
    it("should include dimension details in debug info for DIMENSION_MISMATCH", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.DIMENSION_MISMATCH,
        { expected: 768, actual: 1536 },
        true,
      );

      expect(response.debugInfo).toBeDefined();
      expect(response.debugInfo.expectedDimensions).toBe(768);
      expect(response.debugInfo.actualDimensions).toBe(1536);
    });

    /**
     * Test debug info for collection errors
     * Requirement 6.5
     */
    it("should include project details in debug info for collection errors", () => {
      const response = errorHandler.createErrorResponse(
        ErrorCode.NO_COLLECTION,
        { projectId: "test-123", collectionName: "chatbot_project_test-123" },
        true,
      );

      expect(response.debugInfo).toBeDefined();
      expect(response.debugInfo.projectId).toBe("test-123");
      expect(response.debugInfo.collectionName).toBe(
        "chatbot_project_test-123",
      );
    });
  });

  describe("handleIdkResponse", () => {
    /**
     * Test mapping IdkReason to ErrorCode
     * Requirement 6.2
     */
    it("should map NO_COLLECTION reason to NO_COLLECTION error code", () => {
      const response = errorHandler.handleIdkResponse(
        IdkReason.NO_COLLECTION,
        { projectId: "test" },
        false,
      );

      expect(response.code).toBe(ErrorCode.NO_COLLECTION);
    });

    it("should map THRESHOLD_NOT_MET reason to THRESHOLD_NOT_MET error code", () => {
      const response = errorHandler.handleIdkResponse(
        IdkReason.THRESHOLD_NOT_MET,
        { highestScore: 0.3, threshold: 0.4 },
        false,
      );

      expect(response.code).toBe(ErrorCode.THRESHOLD_NOT_MET);
    });

    it("should map EMBEDDING_ERROR reason to EMBEDDING_ERROR error code", () => {
      const response = errorHandler.handleIdkResponse(
        IdkReason.EMBEDDING_ERROR,
        { error: "timeout" },
        false,
      );

      expect(response.code).toBe(ErrorCode.EMBEDDING_ERROR);
    });
  });

  describe("createErrorFromException", () => {
    /**
     * Test error detection from exception messages
     * Requirement 6.1, 6.3, 6.4
     */
    it("should detect NO_COLLECTION from error message", () => {
      const error = new Error("NO_COLLECTION: Collection not found");
      const response = errorHandler.createErrorFromException(error, false);

      expect(response.code).toBe(ErrorCode.NO_COLLECTION);
    });

    it("should detect DIMENSION_MISMATCH from error message", () => {
      const error = new Error("DIMENSION_MISMATCH: Expected 768 got 1536");
      const response = errorHandler.createErrorFromException(error, false);

      expect(response.code).toBe(ErrorCode.DIMENSION_MISMATCH);
      expect(response.debugInfo).toBeUndefined(); // debug mode off
    });

    it("should detect CHROMADB_ERROR from error message", () => {
      const error = new Error("CHROMADB_ERROR: Connection failed");
      const response = errorHandler.createErrorFromException(error, false);

      expect(response.code).toBe(ErrorCode.CHROMADB_ERROR);
    });

    it("should default to CONFIG_ERROR for unknown errors", () => {
      const error = new Error("Something went wrong");
      const response = errorHandler.createErrorFromException(error, false);

      expect(response.code).toBe(ErrorCode.CONFIG_ERROR);
    });

    it("should extract dimensions from DIMENSION_MISMATCH error message", () => {
      const error = new Error("DIMENSION_MISMATCH: Expected 768 got 1536");
      const response = errorHandler.createErrorFromException(error, true);

      expect(response.debugInfo).toBeDefined();
      expect(response.debugInfo.expectedDimensions).toBe(768);
      expect(response.debugInfo.actualDimensions).toBe(1536);
    });
  });

  describe("validateErrorResponse", () => {
    /**
     * Test error response validation
     * Requirement 6.6
     */
    it("should validate a complete error response", () => {
      const response: ErrorResponse = {
        code: ErrorCode.NO_COLLECTION,
        message: "Collection not found",
        userMessage: "No documents uploaded",
        suggestion: "Upload documents",
      };

      expect(errorHandler.validateErrorResponse(response)).toBe(true);
    });

    it("should reject error response missing code", () => {
      const response: any = {
        message: "Collection not found",
        userMessage: "No documents uploaded",
        suggestion: "Upload documents",
      };

      expect(errorHandler.validateErrorResponse(response)).toBe(false);
    });

    it("should reject error response missing userMessage", () => {
      const response: any = {
        code: ErrorCode.NO_COLLECTION,
        message: "Collection not found",
        suggestion: "Upload documents",
      };

      expect(errorHandler.validateErrorResponse(response)).toBe(false);
    });

    it("should accept error response with null suggestion", () => {
      const response: ErrorResponse = {
        code: ErrorCode.CONFIG_ERROR,
        message: "Config error",
        userMessage: "Configuration invalid",
        suggestion: null,
      };

      expect(errorHandler.validateErrorResponse(response)).toBe(true);
    });
  });

  describe("Error Response Structure", () => {
    /**
     * Test that all error responses have consistent structure
     * Requirement 6.1
     */
    it("should return consistent structure for all error codes", () => {
      const errorCodes = [
        ErrorCode.NO_COLLECTION,
        ErrorCode.EMPTY_COLLECTION,
        ErrorCode.THRESHOLD_NOT_MET,
        ErrorCode.EMBEDDING_ERROR,
        ErrorCode.CHROMADB_ERROR,
        ErrorCode.DIMENSION_MISMATCH,
      ];

      errorCodes.forEach((errorCode) => {
        const response = errorHandler.createErrorResponse(errorCode, {}, false);

        expect(response).toHaveProperty("code");
        expect(response).toHaveProperty("message");
        expect(response).toHaveProperty("userMessage");
        expect(response).toHaveProperty("suggestion");
        expect(typeof response.code).toBe("string");
        expect(typeof response.message).toBe("string");
        expect(typeof response.userMessage).toBe("string");
      });
    });
  });
});
