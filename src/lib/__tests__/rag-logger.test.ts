/**
 * Unit tests for RagLogger
 * Tests structured logging functionality for the RAG pipeline
 */

import {
  RagLogger,
  LogContext,
  IdkReason,
  generateRequestId,
  createLogContext,
} from "../rag-logger";

describe("RagLogger", () => {
  let logger: RagLogger;
  let context: LogContext;

  beforeEach(() => {
    logger = new RagLogger("debug", true, false);
    logger.clearLogs();
    context = createLogContext(
      "test-req-123",
      "test-project-456",
      "validation",
    );
  });

  describe("logQueryStart", () => {
    it("should log query start with request ID, project ID, and query text", () => {
      const query = "What is the capital of France?";

      logger.logQueryStart(context, query);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].requestId).toBe("test-req-123");
      expect(logs[0].projectId).toBe("test-project-456");
      expect(logs[0].stage).toBe("validation");
      expect(logs[0].message).toBe("Query processing started");
      expect(logs[0].data?.query).toBe(query);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe("logEmbeddingGeneration", () => {
    it("should log embedding dimensions and sample values", () => {
      const dimensions = 768;
      const sampleValues = [
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2,
      ];

      logger.logEmbeddingGeneration(context, dimensions, sampleValues);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Embedding generated");
      expect(logs[0].data?.embeddingDimensions).toBe(768);
      expect(logs[0].data?.embeddingSample).toHaveLength(10); // First 10 values
      expect(logs[0].data?.embeddingSample).toEqual(sampleValues.slice(0, 10));
    });
  });

  describe("logSimilaritySearch", () => {
    it("should log search result count and similarity scores", () => {
      const resultCount = 5;
      const scores = [0.95, 0.87, 0.76, 0.65, 0.54];

      logger.logSimilaritySearch(context, resultCount, scores);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Similarity search completed");
      expect(logs[0].data?.searchResultCount).toBe(5);
      expect(logs[0].data?.similarityScores).toEqual(scores);
    });
  });

  describe("logThresholdCheck", () => {
    it("should log threshold check with highest score and threshold", () => {
      const highestScore = 0.85;
      const threshold = 0.75;
      const passed = true;

      logger.logThresholdCheck(context, highestScore, threshold, passed);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Threshold check passed");
      expect(logs[0].level).toBe("info");
      expect(logs[0].data?.highestScore).toBe(0.85);
      expect(logs[0].data?.threshold).toBe(0.75);
      expect(logs[0].data?.passed).toBe(true);
    });

    it("should log warning when threshold check fails", () => {
      const highestScore = 0.65;
      const threshold = 0.75;
      const passed = false;

      logger.logThresholdCheck(context, highestScore, threshold, passed);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Threshold check failed");
      expect(logs[0].level).toBe("warn");
      expect(logs[0].data?.passed).toBe(false);
    });
  });

  describe("logIdkResponse", () => {
    it("should log IDK response with specific reason", () => {
      const reason = IdkReason.THRESHOLD_NOT_MET;
      const details = { highestScore: 0.32, threshold: 0.4 };

      logger.logIdkResponse(context, reason, details);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Returning 'I don't know' response");
      expect(logs[0].level).toBe("warn");
      expect(logs[0].data?.idkReason).toBe("threshold_not_met");
      expect(logs[0].data?.details).toEqual(details);
    });

    it("should support all IDK reason types", () => {
      const reasons = [
        IdkReason.NO_COLLECTION,
        IdkReason.EMPTY_COLLECTION,
        IdkReason.NO_SEARCH_RESULTS,
        IdkReason.THRESHOLD_NOT_MET,
        IdkReason.EMBEDDING_ERROR,
        IdkReason.CHROMADB_ERROR,
      ];

      reasons.forEach((reason) => {
        logger.clearLogs();
        logger.logIdkResponse(context, reason, {});

        const logs = logger.getLogs();
        expect(logs[0].data?.idkReason).toBe(reason);
      });
    });
  });

  describe("logCollectionStatus", () => {
    it("should log collection existence and document count", () => {
      const exists = true;
      const documentCount = 42;

      logger.logCollectionStatus(context, exists, documentCount);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Collection status checked");
      expect(logs[0].data?.collectionExists).toBe(true);
      expect(logs[0].data?.documentCount).toBe(42);
    });
  });

  describe("logError", () => {
    it("should log error with context and stage", () => {
      const error = new Error("Test error message");
      error.stack = "Error stack trace";
      const stage = "embedding";

      logger.logError(context, error, stage);

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe("error");
      expect(logs[0].message).toBe("Error in embedding");
      expect(logs[0].data?.error.name).toBe("Error");
      expect(logs[0].data?.error.message).toBe("Test error message");
      expect(logs[0].data?.error.stack).toBeDefined();
    });
  });

  describe("log level filtering", () => {
    it("should filter logs based on configured log level", () => {
      const infoLogger = new RagLogger("info", true, false);
      const debugContext = createLogContext("req-1", "proj-1", "validation");

      infoLogger.debug(debugContext, "Debug message");
      infoLogger.info(debugContext, "Info message");
      infoLogger.warn(debugContext, "Warn message");
      infoLogger.logError(debugContext, new Error("Error"), "test");

      const logs = infoLogger.getLogs();
      // Debug should be filtered out, only info, warn, error should be logged
      expect(logs.length).toBe(3);
      expect(logs[0].level).toBe("info");
      expect(logs[1].level).toBe("warn");
      expect(logs[2].level).toBe("error");
    });
  });

  describe("request ID correlation", () => {
    it("should correlate logs by request ID", () => {
      const requestId = "req-correlation-test";
      const ctx1 = createLogContext(requestId, "proj-1", "validation");
      const ctx2 = createLogContext(requestId, "proj-1", "embedding");
      const ctx3 = createLogContext(requestId, "proj-1", "search");

      logger.logQueryStart(ctx1, "test query");
      logger.logEmbeddingGeneration(ctx2, 768, [0.1, 0.2]);
      logger.logSimilaritySearch(ctx3, 5, [0.9, 0.8]);

      const correlatedLogs = logger.getLogsByRequestId(requestId);
      expect(correlatedLogs.length).toBe(3);
      expect(correlatedLogs[0].stage).toBe("validation");
      expect(correlatedLogs[1].stage).toBe("embedding");
      expect(correlatedLogs[2].stage).toBe("search");
    });
  });

  describe("stage filtering", () => {
    it("should filter logs by stage", () => {
      const ctx1 = createLogContext("req-1", "proj-1", "validation");
      const ctx2 = createLogContext("req-2", "proj-1", "embedding");
      const ctx3 = createLogContext("req-3", "proj-1", "validation");

      logger.info(ctx1, "Validation 1");
      logger.info(ctx2, "Embedding 1");
      logger.info(ctx3, "Validation 2");

      const validationLogs = logger.getLogsByStage("validation");
      expect(validationLogs.length).toBe(2);
      expect(validationLogs[0].message).toBe("Validation 1");
      expect(validationLogs[1].message).toBe("Validation 2");
    });
  });

  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe("createLogContext", () => {
    it("should create log context with all required fields", () => {
      const requestId = "test-req";
      const projectId = "test-proj";
      const stage = "search";

      const ctx = createLogContext(requestId, projectId, stage);

      expect(ctx.requestId).toBe(requestId);
      expect(ctx.projectId).toBe(projectId);
      expect(ctx.stage).toBe(stage);
      expect(ctx.timestamp).toBeInstanceOf(Date);
    });

    it("should handle undefined projectId", () => {
      const ctx = createLogContext("req-1", undefined, "validation");

      expect(ctx.requestId).toBe("req-1");
      expect(ctx.projectId).toBeUndefined();
      expect(ctx.stage).toBe("validation");
    });
  });

  describe("clearLogs", () => {
    it("should clear all stored logs", () => {
      logger.info(context, "Test message 1");
      logger.info(context, "Test message 2");

      expect(logger.getLogs().length).toBe(2);

      logger.clearLogs();

      expect(logger.getLogs().length).toBe(0);
    });
  });
});
