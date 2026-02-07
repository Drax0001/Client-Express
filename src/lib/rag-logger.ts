/**
 * RAG Logger Module
 *
 * Provides structured logging for the RAG pipeline with request ID correlation,
 * stage-specific logging, and JSON formatting for observability.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

/**
 * Log context interface for request correlation
 */
export interface LogContext {
  requestId: string;
  projectId?: string;
  stage: "validation" | "embedding" | "search" | "filtering" | "response";
  timestamp: Date;
}

/**
 * Reasons for "I don't know" responses
 */
export enum IdkReason {
  NO_COLLECTION = "no_collection",
  EMPTY_COLLECTION = "empty_collection",
  NO_SEARCH_RESULTS = "no_search_results",
  THRESHOLD_NOT_MET = "threshold_not_met",
  EMBEDDING_ERROR = "embedding_error",
  CHROMADB_ERROR = "chromadb_error",
}

/**
 * Log entry structure for structured logging
 */
export interface RagLogEntry {
  timestamp: Date;
  requestId: string;
  projectId?: string;
  stage: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, any>;
}

/**
 * Log level type
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * RAG Logger class
 * Provides structured logging methods for each stage of the RAG pipeline
 */
export class RagLogger {
  private logLevel: LogLevel;
  private enableConsole: boolean;
  private enableFile: boolean;
  private logs: RagLogEntry[] = [];

  constructor(
    logLevel: LogLevel = "info",
    enableConsole: boolean = true,
    enableFile: boolean = false,
  ) {
    this.logLevel = logLevel;
    this.enableConsole = enableConsole;
    this.enableFile = enableFile;
  }

  /**
   * Logs the start of a query with request ID and query text
   * Requirement 1.1: Log projectId and query text
   * Requirement 1.7: Include timestamps and request IDs
   */
  logQueryStart(context: LogContext, query: string): void {
    this.log({
      ...context,
      level: "info",
      message: "Query processing started",
      data: {
        query,
      },
    });
  }

  /**
   * Logs embedding generation with dimensions and sample values
   * Requirement 1.2: Log embedding dimensions and sample values
   */
  logEmbeddingGeneration(
    context: LogContext,
    dimensions: number,
    sampleValues: number[],
  ): void {
    this.log({
      ...context,
      level: "debug",
      message: "Embedding generated",
      data: {
        embeddingDimensions: dimensions,
        embeddingSample: sampleValues.slice(0, 10), // First 10 values
      },
    });
  }

  /**
   * Logs similarity search results with count and scores
   * Requirement 1.3: Log number of results and similarity scores
   */
  logSimilaritySearch(
    context: LogContext,
    resultCount: number,
    scores: number[],
  ): void {
    this.log({
      ...context,
      level: "info",
      message: "Similarity search completed",
      data: {
        searchResultCount: resultCount,
        similarityScores: scores,
      },
    });
  }

  /**
   * Logs threshold check with highest score and configured threshold
   * Requirement 1.4: Log highest score and threshold
   */
  logThresholdCheck(
    context: LogContext,
    highestScore: number,
    threshold: number,
    passed: boolean,
  ): void {
    this.log({
      ...context,
      level: passed ? "info" : "warn",
      message: `Threshold check ${passed ? "passed" : "failed"}`,
      data: {
        highestScore,
        threshold,
        passed,
      },
    });
  }

  /**
   * Logs "I don't know" response with specific reason
   * Requirement 1.5: Log specific reason for IDK response
   */
  logIdkResponse(context: LogContext, reason: IdkReason, details: any): void {
    this.log({
      ...context,
      level: "warn",
      message: "Returning 'I don't know' response",
      data: {
        idkReason: reason,
        details,
      },
    });
  }

  /**
   * Logs collection status
   * Requirement 1.6: Log collection existence and document count
   */
  logCollectionStatus(
    context: LogContext,
    exists: boolean,
    documentCount: number,
  ): void {
    this.log({
      ...context,
      level: "info",
      message: "Collection status checked",
      data: {
        collectionExists: exists,
        documentCount,
      },
    });
  }

  /**
   * Logs errors with context
   */
  logError(context: LogContext, error: Error, stage: string): void {
    this.log({
      ...context,
      level: "error",
      message: `Error in ${stage}`,
      data: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
    });
  }

  /**
   * Generic info logging
   */
  info(context: LogContext, message: string, data?: Record<string, any>): void {
    this.log({
      ...context,
      level: "info",
      message,
      data,
    });
  }

  /**
   * Generic warning logging
   */
  warn(context: LogContext, message: string, data?: Record<string, any>): void {
    this.log({
      ...context,
      level: "warn",
      message,
      data,
    });
  }

  /**
   * Generic debug logging
   */
  debug(
    context: LogContext,
    message: string,
    data?: Record<string, any>,
  ): void {
    this.log({
      ...context,
      level: "debug",
      message,
      data,
    });
  }

  /**
   * Core logging method that handles log level filtering and output
   */
  private log(entry: RagLogEntry): void {
    // Check if this log level should be output
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Store log entry
    this.logs.push(entry);

    // Output to console if enabled
    if (this.enableConsole) {
      this.outputToConsole(entry);
    }

    // Output to file if enabled (simplified for now)
    if (this.enableFile) {
      this.outputToFile(entry);
    }
  }

  /**
   * Determines if a log entry should be output based on configured log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const configuredLevelIndex = levels.indexOf(this.logLevel);
    const entryLevelIndex = levels.indexOf(level);
    return entryLevelIndex >= configuredLevelIndex;
  }

  /**
   * Outputs log entry to console with JSON formatting
   */
  private outputToConsole(entry: RagLogEntry): void {
    const logData = {
      timestamp: entry.timestamp.toISOString(),
      requestId: entry.requestId,
      projectId: entry.projectId,
      stage: entry.stage,
      level: entry.level,
      message: entry.message,
      ...entry.data,
    };

    const jsonLog = JSON.stringify(logData);

    switch (entry.level) {
      case "error":
        console.error(jsonLog);
        break;
      case "warn":
        console.warn(jsonLog);
        break;
      case "debug":
        console.debug(jsonLog);
        break;
      default:
        console.log(jsonLog);
    }
  }

  /**
   * Outputs log entry to file (simplified implementation)
   * In production, this would use a proper file transport
   */
  private outputToFile(entry: RagLogEntry): void {
    // Simplified: In production, use fs.appendFile or a logging library
    // For now, we just store in memory
  }

  /**
   * Gets all stored log entries (useful for testing)
   */
  getLogs(): RagLogEntry[] {
    return [...this.logs];
  }

  /**
   * Gets logs filtered by stage
   */
  getLogsByStage(stage: string): RagLogEntry[] {
    return this.logs.filter((log) => log.stage === stage);
  }

  /**
   * Gets logs filtered by request ID
   */
  getLogsByRequestId(requestId: string): RagLogEntry[] {
    return this.logs.filter((log) => log.requestId === requestId);
  }

  /**
   * Clears all stored logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Generates a unique request ID for correlation
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Creates a log context for a request
 */
export function createLogContext(
  requestId: string,
  projectId: string | undefined,
  stage: LogContext["stage"],
): LogContext {
  return {
    requestId,
    projectId,
    stage,
    timestamp: new Date(),
  };
}

// Export a singleton instance for convenience
export const ragLogger = new RagLogger();
