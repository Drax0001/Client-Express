/**
 * Enhanced RAG Service
 *
 * Orchestrates the RAG pipeline with comprehensive validation, logging, and error handling.
 * Integrates all diagnostic and validation components to address the "I don't know" bug.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 3.5
 */

import { ProjectService } from "./project.service";
import { EmbeddingService } from "../lib/embedding-service";
import { VectorStore } from "../lib/vector-store";
import { LLMService } from "../lib/llm-service";
import {
  RagLogger,
  generateRequestId,
  createLogContext,
  IdkReason,
  LogContext,
} from "../lib/rag-logger";
import { VectorStoreValidator } from "../lib/vector-store-validator";
import { EmbeddingConsistencyChecker } from "../lib/embedding-consistency-checker";
import { RelevanceThresholdManager } from "../lib/relevance-threshold-manager";
import { RetryHandler } from "../lib/retry-handler";
import {
  NotFoundError,
  ValidationError,
  ServiceUnavailableError,
} from "../lib/errors";
import { getConfig } from "../lib/config";
import {
  RagErrorHandler,
  ErrorCode,
  ErrorResponse,
} from "../lib/rag-error-handler";

/**
 * Chat request interface with debug and force answer options
 */
export interface EnhancedChatRequest {
  projectId: string;
  message: string;
  debugMode?: boolean;
  forceAnswer?: boolean; // Bypass threshold for debugging
}

/**
 * Chat response interface with debug information
 */
export interface EnhancedChatResponse {
  answer: string;
  success: boolean;
  sourceCount: number;
  debugInfo?: DebugInfo;
  error?: ErrorInfo;
}

/**
 * Debug information included when debug mode is enabled
 */
export interface DebugInfo {
  requestId: string;
  collectionStatus: {
    exists: boolean;
    documentCount: number;
    embeddingDimensions: number | null;
  };
  embeddingDimensions: number;
  searchResults: {
    count: number;
    topScore: number | null;
    scores: number[];
    previews: string[];
  };
  thresholdCheck: {
    threshold: number;
    highestScore: number | null;
    passed: boolean;
    margin: number;
    recommendation: string | null;
  };
  processingTimeMs: number;
}

/**
 * Error information for failed requests
 */
export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  suggestion: string | null;
  technicalDetails?: any;
}

/**
 * Search result from vector store
 */
interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: Record<string, any>;
}

/**
 * Enhanced RAG Service class
 * Orchestrates the complete RAG pipeline with validation and logging
 */
export class EnhancedRagService {
  private projectService: ProjectService;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private llmService: LLMService;
  private logger: RagLogger;
  private vectorStoreValidator: VectorStoreValidator;
  private embeddingChecker: EmbeddingConsistencyChecker;
  private thresholdManager: RelevanceThresholdManager;
  private retryHandler: RetryHandler;
  private errorHandler: RagErrorHandler;
  private config = getConfig();

  constructor(
    logger?: RagLogger,
    vectorStore?: VectorStore,
    embeddingService?: EmbeddingService,
  ) {
    this.projectService = new ProjectService();
    this.embeddingService = embeddingService || new EmbeddingService();
    this.vectorStore = vectorStore || new VectorStore();
    this.llmService = new LLMService();
    this.logger = logger || new RagLogger();
    this.vectorStoreValidator = new VectorStoreValidator(this.vectorStore);
    this.embeddingChecker = new EmbeddingConsistencyChecker();
    this.thresholdManager = new RelevanceThresholdManager();
    this.retryHandler = new RetryHandler(this.logger, this.embeddingService);
    this.errorHandler = new RagErrorHandler();
  }

  /**
   * Processes a chat query through the enhanced RAG pipeline
   * Requirement 1.1: Log projectId and query text
   *
   * @param request - The chat request
   * @returns Promise resolving to the chat response
   */
  async chat(request: EnhancedChatRequest): Promise<EnhancedChatResponse> {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const {
      projectId,
      message,
      debugMode = false,
      forceAnswer = false,
    } = request;

    // Create log context for validation stage
    const validationContext = createLogContext(
      requestId,
      projectId,
      "validation",
    );

    // Log query start
    this.logger.logQueryStart(validationContext, message);

    try {
      // Validate request
      if (!projectId || !projectId.trim()) {
        throw new ValidationError("Project ID is required");
      }

      if (!message || !message.trim()) {
        throw new ValidationError("Message is required");
      }

      // Validate project exists
      try {
        await this.projectService.getProject(projectId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new NotFoundError(`Project '${projectId}' not found`);
        }
        throw error;
      }

      // Pre-query validation
      await this.validatePreQuery(projectId, requestId);

      // Generate query embedding with retry
      const embeddingContext = createLogContext(
        requestId,
        projectId,
        "embedding",
      );
      const queryEmbedding = await this.generateQueryEmbedding(
        message,
        embeddingContext,
      );

      // Perform similarity search
      const searchContext = createLogContext(requestId, projectId, "search");
      const searchResults = await this.performSimilaritySearch(
        projectId,
        queryEmbedding,
        searchContext,
      );

      // Filter by relevance threshold
      const filteringContext = createLogContext(
        requestId,
        projectId,
        "filtering",
      );
      const filteredResults = await this.filterByRelevance(
        searchResults,
        projectId,
        filteringContext,
        forceAnswer,
      );

      // If no results passed the threshold, return "I don't know"
      if (!filteredResults.passed) {
        const processingTimeMs = Date.now() - startTime;
        return this.createIdkResponse(
          requestId,
          IdkReason.THRESHOLD_NOT_MET,
          {
            highestScore: filteredResults.highestScore,
            threshold: filteredResults.threshold,
          },
          debugMode,
          processingTimeMs,
          filteredResults,
        );
      }

      // Assemble context and generate response
      const responseContext = createLogContext(
        requestId,
        projectId,
        "response",
      );
      const context = this.assembleContext(filteredResults.results);
      const answer = await this.generateResponse(
        context,
        message,
        responseContext,
      );

      const processingTimeMs = Date.now() - startTime;

      // Build response with optional debug info
      const response: EnhancedChatResponse = {
        answer,
        success: true,
        sourceCount: filteredResults.results.length,
      };

      if (debugMode) {
        response.debugInfo = await this.buildDebugInfo(
          requestId,
          projectId,
          queryEmbedding,
          searchResults,
          filteredResults,
          processingTimeMs,
        );
      }

      return response;
    } catch (error) {
      this.logger.logError(
        validationContext,
        error instanceof Error ? error : new Error(String(error)),
        "chat_processing",
      );

      return this.createErrorResponse(
        requestId,
        error,
        debugMode,
        Date.now() - startTime,
      );
    }
  }

  /**
   * Validates pre-query conditions
   * Requirement 2.3: Verify collection exists before performing similarity search
   *
   * @param projectId - The project identifier
   * @param requestId - The request identifier for logging
   * @throws Error if validation fails
   */
  private async validatePreQuery(
    projectId: string,
    requestId: string,
  ): Promise<void> {
    const context = createLogContext(requestId, projectId, "validation");

    // Check collection exists
    const collectionStatus =
      await this.vectorStoreValidator.getCollectionStatus(projectId);

    this.logger.logCollectionStatus(
      context,
      collectionStatus.exists,
      collectionStatus.documentCount,
    );

    if (!collectionStatus.exists) {
      throw new Error(
        `NO_COLLECTION: Collection does not exist for project ${projectId}`,
      );
    }

    if (collectionStatus.documentCount === 0) {
      throw new Error(
        `EMPTY_COLLECTION: Collection exists but contains no documents for project ${projectId}`,
      );
    }

    // Validate embedding model consistency
    // Requirement 3.5: Validate embedding service is accessible
    const isModelConsistent =
      await this.embeddingChecker.validateEmbeddingModel(projectId);

    if (!isModelConsistent) {
      this.logger.warn(
        context,
        "Embedding model mismatch detected between training and query",
      );
      // Log warning but don't fail - this might be intentional
    }
  }

  /**
   * Generates query embedding with retry and validation
   * Requirement 1.2: Log embedding dimensions and sample values
   *
   * @param query - The query text
   * @param context - Log context
   * @returns Promise resolving to the embedding vector
   */
  private async generateQueryEmbedding(
    query: string,
    context: LogContext,
  ): Promise<number[]> {
    try {
      // Use retry handler for embedding generation
      const embedding = await this.retryHandler.retryEmbeddingGeneration(
        query,
        context,
      );

      // Validate dimensions
      const expectedDimensions = this.config.embedding.dimensions;
      const isValid = this.embeddingChecker.validateEmbeddingDimensions(
        embedding,
        expectedDimensions,
      );

      if (!isValid) {
        throw new Error(
          `DIMENSION_MISMATCH: Expected ${expectedDimensions} dimensions, got ${embedding.length}`,
        );
      }

      // Log embedding generation
      this.logger.logEmbeddingGeneration(
        context,
        embedding.length,
        embedding.slice(0, 10),
      );

      return embedding;
    } catch (error) {
      this.logger.logError(
        context,
        error instanceof Error ? error : new Error(String(error)),
        "embedding_generation",
      );
      throw error;
    }
  }

  /**
   * Performs similarity search with comprehensive logging
   * Requirement 1.3: Log number of results and similarity scores
   *
   * @param projectId - The project identifier
   * @param embedding - The query embedding
   * @param context - Log context
   * @returns Promise resolving to search results
   */
  private async performSimilaritySearch(
    projectId: string,
    embedding: number[],
    context: LogContext,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.vectorStore.similaritySearch(
        projectId,
        embedding,
        15, // Get top 15 results for better coverage
      );

      // Extract scores and log
      const scores = results.map((r) => r.score);
      this.logger.logSimilaritySearch(context, results.length, scores);

      // Log text previews for debugging
      if (results.length > 0) {
        this.logger.debug(context, "Search result previews", {
          previews: results.slice(0, 3).map((r) => ({
            score: r.score,
            preview: r.text.substring(0, 100),
          })),
        });
      } else {
        this.logger.warn(context, "Similarity search returned no results");
      }

      return results;
    } catch (error) {
      this.logger.logError(
        context,
        error instanceof Error ? error : new Error(String(error)),
        "similarity_search",
      );
      throw new Error(`CHROMADB_ERROR: ${error}`);
    }
  }

  /**
   * Filters search results by relevance threshold
   * Requirement 1.4: Log highest score and threshold
   *
   * @param results - Search results to filter
   * @param projectId - The project identifier
   * @param context - Log context
   * @param forceAnswer - Whether to bypass threshold check
   * @returns Filtered results with threshold information
   */
  private async filterByRelevance(
    results: SearchResult[],
    projectId: string,
    context: LogContext,
    forceAnswer: boolean = false,
  ): Promise<{
    passed: boolean;
    results: SearchResult[];
    highestScore: number | null;
    threshold: number;
  }> {
    if (results.length === 0) {
      this.logger.logIdkResponse(context, IdkReason.NO_SEARCH_RESULTS, {});
      return {
        passed: false,
        results: [],
        highestScore: null,
        threshold: 0,
      };
    }

    const highestScore = results[0].score;
    const thresholdCheck = await this.thresholdManager.checkRelevance(
      highestScore,
      projectId,
    );

    // Log threshold check
    this.logger.logThresholdCheck(
      context,
      highestScore,
      thresholdCheck.threshold,
      thresholdCheck.passed,
    );

    // Force answer mode bypasses threshold
    if (forceAnswer) {
      this.logger.warn(
        context,
        "Force answer mode enabled, bypassing threshold check",
      );
      return {
        passed: true,
        results,
        highestScore,
        threshold: thresholdCheck.threshold,
      };
    }

    // Soft threshold warning
    if (thresholdCheck.shouldWarn) {
      this.logger.warn(
        context,
        `Score ${highestScore} is within soft margin of threshold ${thresholdCheck.threshold}`,
        {
          margin: thresholdCheck.margin,
          recommendation: thresholdCheck.recommendation,
        },
      );
      // Still provide answer but log warning
      return {
        passed: true,
        results,
        highestScore,
        threshold: thresholdCheck.threshold,
      };
    }

    // Check if threshold passed
    if (!thresholdCheck.passed) {
      this.logger.logIdkResponse(context, IdkReason.THRESHOLD_NOT_MET, {
        highestScore,
        threshold: thresholdCheck.threshold,
        margin: thresholdCheck.margin,
      });

      return {
        passed: false,
        results: [],
        highestScore,
        threshold: thresholdCheck.threshold,
      };
    }

    // Filter results that meet the threshold
    const passedResults = results.filter(
      (r) => r.score >= thresholdCheck.threshold,
    );

    return {
      passed: true,
      results: passedResults,
      highestScore,
      threshold: thresholdCheck.threshold,
    };
  }

  /**
   * Assembles context from search results
   *
   * @param searchResults - The filtered search results
   * @returns The assembled context string
   */
  private assembleContext(searchResults: SearchResult[]): string {
    const maxContextTokens = 6000; // Increased for better coverage
    const maxContextChars = maxContextTokens * 4;

    let context = "";
    for (const result of searchResults) {
      const chunkText = result.text.trim();
      if (!chunkText) continue;

      // Build source label from metadata for attribution
      const meta = result.metadata || {};
      const source = meta.filename || meta.sourceUrl || "Unknown";
      const section = meta.sectionTitle || meta.section || "";
      const page = meta.pageNumber ? `Page ${meta.pageNumber}` : "";
      const label = [source, section, page].filter(Boolean).join(" > ");
      const tagged = `[Source: ${label}]\n${chunkText}`;

      const newContext = context ? `${context}\n\n---\n\n${tagged}` : tagged;

      if (newContext.length > maxContextChars) {
        break;
      }

      context = newContext;
    }

    return context || "No relevant context found.";
  }

  /**
   * Generates LLM response with context
   *
   * @param context - The assembled context
   * @param query - The user query
   * @param logContext - Log context
   * @returns Promise resolving to the LLM response
   */
  private async generateResponse(
    context: string,
    query: string,
    logContext: LogContext,
  ): Promise<string> {
    const systemPrompt = `You are a knowledgeable assistant answering questions based ONLY on the provided context documents.

RULES:
1. Answer ONLY using information from the provided context
2. When you reference information, ALWAYS cite the source using [Source: filename/url] format shown in the context
3. If information spans multiple sources, synthesize them and cite each
4. If the answer is partially in the context, share what you can and note what's missing
5. If the answer is NOT in the context at all, say: "I don't have enough information in the provided documents to answer this question."
6. Be detailed and thorough — users uploaded these documents for comprehensive answers`;

    const userPrompt = `Context (each block is tagged with its source document):
${context}

Question: ${query}

Answer the question based on the context provided above. Cite your sources.`;

    try {
      const response = await this.llmService.generateResponse(
        systemPrompt,
        userPrompt,
      );

      this.logger.info(logContext, "LLM response generated", {
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      this.logger.logError(
        logContext,
        error instanceof Error ? error : new Error(String(error)),
        "llm_generation",
      );
      throw new ServiceUnavailableError("Unable to generate response");
    }
  }

  /**
   * Creates an "I don't know" response with debug information
   * Uses RagErrorHandler for consistent error messaging
   * Requirement 6.2, 6.5
   *
   * @param requestId - The request identifier
   * @param reason - The reason for the IDK response
   * @param details - Additional details
   * @param debugMode - Whether to include debug info
   * @param processingTimeMs - Processing time
   * @param filteredResults - Filtered results for debug info
   * @returns The IDK response
   */
  private createIdkResponse(
    requestId: string,
    reason: IdkReason,
    details: any,
    debugMode: boolean,
    processingTimeMs: number,
    filteredResults: any,
  ): EnhancedChatResponse {
    // Use error handler to create structured error response
    const errorResponse = this.errorHandler.handleIdkResponse(
      reason,
      details,
      debugMode,
    );

    const response: EnhancedChatResponse = {
      answer: errorResponse.userMessage,
      success: true,
      sourceCount: 0,
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        userMessage: errorResponse.userMessage,
        suggestion: errorResponse.suggestion,
        technicalDetails: debugMode ? errorResponse.debugInfo : undefined,
      },
    };

    if (debugMode) {
      response.debugInfo = {
        requestId,
        collectionStatus: {
          exists: true,
          documentCount: 0,
          embeddingDimensions: null,
        },
        embeddingDimensions: 0,
        searchResults: {
          count: 0,
          topScore: filteredResults.highestScore,
          scores: [],
          previews: [],
        },
        thresholdCheck: {
          threshold: filteredResults.threshold,
          highestScore: filteredResults.highestScore,
          passed: false,
          margin: filteredResults.highestScore
            ? filteredResults.highestScore - filteredResults.threshold
            : 0,
          recommendation: details.recommendation || null,
        },
        processingTimeMs,
      };
    }

    return response;
  }

  /**
   * Creates an error response using RagErrorHandler
   * Requirement 6.1, 6.3, 6.4, 6.6
   *
   * @param requestId - The request identifier
   * @param error - The error that occurred
   * @param debugMode - Whether to include debug info
   * @param processingTimeMs - Processing time
   * @returns The error response
   */
  private createErrorResponse(
    requestId: string,
    error: any,
    debugMode: boolean,
    processingTimeMs: number,
  ): EnhancedChatResponse {
    // Use error handler to create structured error response
    const errorResponse = this.errorHandler.createErrorFromException(
      error,
      debugMode,
    );

    return {
      answer: "",
      success: false,
      sourceCount: 0,
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        userMessage: errorResponse.userMessage,
        suggestion: errorResponse.suggestion,
        technicalDetails: debugMode ? errorResponse.debugInfo : undefined,
      },
    };
  }

  /**
   * Builds debug information for the response
   *
   * @param requestId - The request identifier
   * @param projectId - The project identifier
   * @param queryEmbedding - The query embedding
   * @param searchResults - The search results
   * @param filteredResults - The filtered results
   * @param processingTimeMs - Processing time
   * @returns Promise resolving to debug info
   */
  private async buildDebugInfo(
    requestId: string,
    projectId: string,
    queryEmbedding: number[],
    searchResults: SearchResult[],
    filteredResults: any,
    processingTimeMs: number,
  ): Promise<DebugInfo> {
    const collectionStatus =
      await this.vectorStoreValidator.getCollectionStatus(projectId);

    return {
      requestId,
      collectionStatus: {
        exists: collectionStatus.exists,
        documentCount: collectionStatus.documentCount,
        embeddingDimensions: collectionStatus.embeddingDimension,
      },
      embeddingDimensions: queryEmbedding.length,
      searchResults: {
        count: searchResults.length,
        topScore: searchResults.length > 0 ? searchResults[0].score : null,
        scores: searchResults.map((r) => r.score),
        previews: searchResults
          .slice(0, 5)
          .map((r) => r.text.substring(0, 100)),
      },
      thresholdCheck: {
        threshold: filteredResults.threshold,
        highestScore: filteredResults.highestScore,
        passed: filteredResults.passed,
        margin: filteredResults.highestScore
          ? filteredResults.highestScore - filteredResults.threshold
          : 0,
        recommendation: null,
      },
      processingTimeMs,
    };
  }
}
