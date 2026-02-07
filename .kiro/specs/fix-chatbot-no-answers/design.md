# Design Document: Fix Chatbot "I don't know" Issue

## Overview

This design addresses a critical bug where chatbots consistently return "I don't know" responses regardless of query content. The issue stems from multiple potential failure points in the RAG (Retrieval-Augmented Generation) pipeline, including misconfigured relevance thresholds, empty vector stores, embedding mismatches, and insufficient error visibility.

The solution enhances the existing RAG architecture with comprehensive diagnostic logging, validation mechanisms, and recovery strategies without fundamentally changing the system's structure. The design focuses on making the pipeline observable, verifiable, and resilient.

### Key Design Principles

1. **Observability First**: Every stage of the RAG pipeline must be logged with sufficient detail to diagnose failures
2. **Fail Fast with Context**: Validation should occur early with specific, actionable error messages
3. **Graceful Degradation**: The system should attempt recovery when possible while maintaining data integrity
4. **Backward Compatibility**: Changes should not break existing chatbot configurations

### RAG Pipeline Overview

The current RAG pipeline consists of these stages:

1. **Training Phase**: Documents → Chunking → Embedding → ChromaDB Storage
2. **Query Phase**: User Query → Query Embedding → Similarity Search → Relevance Filtering → LLM Response

The "I don't know" response can be triggered at multiple points in the query phase, and this design adds visibility and validation at each stage.

## Architecture

### System Components

The design introduces enhancements to existing components rather than new architectural elements:

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat API Endpoint                        │
│  - Request validation                                        │
│  - Request ID generation for tracing                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Enhanced RAG Service                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Pre-Query Validation                            │   │
│  │     - Collection existence check                    │   │
│  │     - Document count verification                   │   │
│  │     - Configuration validation                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2. Query Embedding Generation                      │   │
│  │     - Embedding service call                        │   │
│  │     - Dimension validation                          │   │
│  │     - Retry logic with exponential backoff          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  3. Similarity Search                               │   │
│  │     - ChromaDB query with logging                   │   │
│  │     - Result count and score logging                │   │
│  │     - Empty result handling                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  4. Relevance Filtering                             │   │
│  │     - Threshold comparison with logging             │   │
│  │     - Soft threshold for near-misses                │   │
│  │     - Debug mode bypass                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  5. Response Generation                             │   │
│  │     - Context assembly                              │   │
│  │     - LLM call                                      │   │
│  │     - Error message formatting                      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Structured Logger                               │
│  - Request ID correlation                                    │
│  - Stage-specific log levels                                 │
│  - JSON-formatted logs for parsing                           │
└─────────────────────────────────────────────────────────────┘
```

### Enhanced Training Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                  Training API Endpoint                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│            Enhanced Training Service                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Document Processing                             │   │
│  │     - Chunking with count tracking                  │   │
│  │     - Chunk size validation                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2. Embedding Generation                            │   │
│  │     - Batch embedding with progress logging         │   │
│  │     - Dimension validation                          │   │
│  │     - Model/provider logging                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  3. Vector Store Persistence                        │   │
│  │     - ChromaDB upsert with verification             │   │
│  │     - Collection creation/update                    │   │
│  │     - Metadata storage                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  4. Post-Training Verification                      │   │
│  │     - Collection query to verify storage            │   │
│  │     - Test similarity search                        │   │
│  │     - Metadata update with training stats           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### New Debug and Validation Endpoints

```
GET  /api/debug/collection/:projectId
     - Returns collection statistics
     - Document count, embedding dimensions
     - Sample embeddings

POST /api/debug/test-query
     - Accepts projectId and test query
     - Returns detailed pipeline execution info
     - Similarity scores, threshold comparison

GET  /api/health/rag
     - Validates all RAG dependencies
     - ChromaDB connectivity
     - Embedding service availability
     - Configuration validation

POST /api/admin/verify-training/:projectId
     - Re-verifies training completion
     - Checks collection integrity
     - Returns discrepancies
```

## Components and Interfaces

### 1. Enhanced Logger Module

A structured logging utility that provides consistent, traceable logs across the RAG pipeline.

```typescript
interface LogContext {
  requestId: string;
  projectId?: string;
  stage: "validation" | "embedding" | "search" | "filtering" | "response";
  timestamp: Date;
}

interface RagLogger {
  // Core logging methods
  logQueryStart(context: LogContext, query: string): void;
  logEmbeddingGeneration(
    context: LogContext,
    dimensions: number,
    sampleValues: number[],
  ): void;
  logSimilaritySearch(
    context: LogContext,
    resultCount: number,
    scores: number[],
  ): void;
  logThresholdCheck(
    context: LogContext,
    highestScore: number,
    threshold: number,
    passed: boolean,
  ): void;
  logIdkResponse(context: LogContext, reason: IdkReason, details: any): void;

  // Collection logging
  logCollectionStatus(
    context: LogContext,
    exists: boolean,
    documentCount: number,
  ): void;

  // Error logging
  logError(context: LogContext, error: Error, stage: string): void;
}

enum IdkReason {
  NO_COLLECTION = "no_collection",
  EMPTY_COLLECTION = "empty_collection",
  NO_SEARCH_RESULTS = "no_search_results",
  THRESHOLD_NOT_MET = "threshold_not_met",
  EMBEDDING_ERROR = "embedding_error",
  CHROMADB_ERROR = "chromadb_error",
}
```

### 2. Vector Store Validator

Validates the state of the vector store before and after operations.

```typescript
interface CollectionStatus {
  exists: boolean;
  documentCount: number;
  embeddingDimension: number | null;
  createdAt: Date | null;
  lastUpdated: Date | null;
}

interface VectorStoreValidator {
  // Pre-query validation
  validateCollectionExists(projectId: string): Promise<boolean>;
  getCollectionStatus(projectId: string): Promise<CollectionStatus>;

  // Post-training validation
  verifyTrainingSuccess(
    projectId: string,
    expectedChunkCount: number,
  ): Promise<ValidationResult>;
  performTestSearch(
    projectId: string,
    testQuery: string,
  ): Promise<SearchTestResult>;

  // Debug utilities
  getSampleEmbeddings(
    projectId: string,
    count: number,
  ): Promise<EmbeddingInfo[]>;
  listAllCollections(): Promise<string[]>;
}

interface ValidationResult {
  success: boolean;
  actualChunkCount: number;
  expectedChunkCount: number;
  discrepancy: number;
  message: string;
}

interface SearchTestResult {
  success: boolean;
  resultCount: number;
  topScore: number | null;
  error: string | null;
}

interface EmbeddingInfo {
  id: string;
  dimensions: number;
  sampleValues: number[]; // First 10 values
  metadata: Record<string, any>;
}
```

### 3. Embedding Consistency Checker

Ensures query embeddings match document embeddings in model and dimensions.

```typescript
interface EmbeddingConfig {
  provider: "gemini" | "openai" | "cohere";
  model: string;
  dimensions: number;
}

interface EmbeddingConsistencyChecker {
  // Validation methods
  validateEmbeddingDimensions(
    embedding: number[],
    expectedDimensions: number,
  ): boolean;
  validateEmbeddingModel(projectId: string): Promise<boolean>;

  // Configuration retrieval
  getTrainingEmbeddingConfig(projectId: string): Promise<EmbeddingConfig>;
  getCurrentEmbeddingConfig(): EmbeddingConfig;

  // Comparison
  compareEmbeddingConfigs(
    config1: EmbeddingConfig,
    config2: EmbeddingConfig,
  ): ConfigComparisonResult;
}

interface ConfigComparisonResult {
  match: boolean;
  differences: {
    provider?: { expected: string; actual: string };
    model?: { expected: string; actual: string };
    dimensions?: { expected: number; actual: number };
  };
}
```

### 4. Relevance Threshold Manager

Manages and validates relevance threshold configuration with per-chatbot overrides.

```typescript
interface ThresholdConfig {
  global: number;
  perChatbot: Map<string, number>;
  softThresholdMargin: number; // e.g., 0.05 for warnings
}

interface RelevanceThresholdManager {
  // Configuration
  loadThresholdConfig(): ThresholdConfig;
  getThresholdForProject(projectId: string): number;
  validateThreshold(threshold: number): boolean;

  // Threshold checking
  checkRelevance(score: number, projectId: string): RelevanceCheckResult;

  // Configuration updates
  updateGlobalThreshold(threshold: number): void;
  updateProjectThreshold(projectId: string, threshold: number): void;
}

interface RelevanceCheckResult {
  passed: boolean;
  score: number;
  threshold: number;
  margin: number; // How far above/below threshold
  shouldWarn: boolean; // True if within soft margin
  recommendation: string | null;
}
```

### 5. Enhanced RAG Service

The main service orchestrating the RAG pipeline with all enhancements.

```typescript
interface ChatRequest {
  projectId: string;
  query: string;
  debugMode?: boolean;
  forceAnswer?: boolean; // Bypass threshold for debugging
}

interface ChatResponse {
  answer: string;
  success: boolean;
  debugInfo?: DebugInfo;
  error?: ErrorInfo;
}

interface DebugInfo {
  requestId: string;
  collectionStatus: CollectionStatus;
  embeddingDimensions: number;
  searchResults: {
    count: number;
    topScore: number | null;
    scores: number[];
    previews: string[];
  };
  thresholdCheck: RelevanceCheckResult;
  processingTimeMs: number;
}

interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string; // User-friendly message
  suggestion: string | null;
  technicalDetails: any;
}

interface EnhancedRagService {
  // Main chat method
  chat(request: ChatRequest): Promise<ChatResponse>;

  // Internal pipeline stages
  validatePreQuery(projectId: string, requestId: string): Promise<void>;
  generateQueryEmbedding(query: string, requestId: string): Promise<number[]>;
  performSimilaritySearch(
    projectId: string,
    embedding: number[],
    requestId: string,
  ): Promise<SearchResult[]>;
  filterByRelevance(
    results: SearchResult[],
    projectId: string,
    requestId: string,
  ): FilteredResults;
  generateResponse(
    context: string[],
    query: string,
    requestId: string,
  ): Promise<string>;

  // Error handling
  handleIdkResponse(
    reason: IdkReason,
    details: any,
    requestId: string,
  ): ChatResponse;
}

interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: Record<string, any>;
}

interface FilteredResults {
  passed: SearchResult[];
  failed: SearchResult[];
  highestScore: number | null;
  thresholdUsed: number;
}
```

### 6. Training Verification Service

Validates training completion and provides re-verification capabilities.

```typescript
interface TrainingMetadata {
  projectId: string;
  chunkCount: number;
  embeddingConfig: EmbeddingConfig;
  trainedAt: Date;
  verified: boolean;
  verificationDetails: VerificationDetails | null;
}

interface VerificationDetails {
  verifiedAt: Date;
  collectionExists: boolean;
  actualChunkCount: number;
  testSearchSuccessful: boolean;
  testSearchScore: number | null;
}

interface TrainingVerificationService {
  // Post-training verification
  verifyTrainingCompletion(
    projectId: string,
    expectedChunkCount: number,
  ): Promise<TrainingMetadata>;

  // Re-verification
  reverifyTraining(projectId: string): Promise<TrainingMetadata>;

  // Metadata management
  storeTrainingMetadata(metadata: TrainingMetadata): Promise<void>;
  getTrainingMetadata(projectId: string): Promise<TrainingMetadata | null>;

  // Discrepancy detection
  detectDiscrepancies(projectId: string): Promise<DiscrepancyReport>;
}

interface DiscrepancyReport {
  hasDiscrepancies: boolean;
  issues: {
    type:
      | "missing_collection"
      | "chunk_count_mismatch"
      | "embedding_dimension_mismatch"
      | "test_search_failed";
    expected: any;
    actual: any;
    severity: "critical" | "warning";
  }[];
  recommendations: string[];
}
```

### 7. Configuration Validator

Validates all configuration on startup and provides health checks.

```typescript
interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
}

interface ConfigError {
  field: string;
  message: string;
  value: any;
}

interface ConfigWarning {
  field: string;
  message: string;
  recommendation: string;
}

interface ConfigurationValidator {
  // Startup validation
  validateAllConfig(): Promise<ConfigValidationResult>;
  validateEmbeddingConfig(): ConfigValidationResult;
  validateChromaDBConfig(): ConfigValidationResult;
  validateThresholdConfig(): ConfigValidationResult;

  // Runtime validation
  testChromaDBConnectivity(): Promise<boolean>;
  testEmbeddingService(): Promise<boolean>;

  // Health check
  getHealthStatus(): Promise<HealthStatus>;
}

interface HealthStatus {
  healthy: boolean;
  services: {
    chromadb: ServiceStatus;
    embeddingService: ServiceStatus;
    configuration: ServiceStatus;
  };
  timestamp: Date;
}

interface ServiceStatus {
  available: boolean;
  responseTimeMs: number | null;
  error: string | null;
}
```

### 8. Retry Handler

Implements exponential backoff for embedding generation and other external calls.

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface RetryHandler {
  // Retry with exponential backoff
  retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: LogContext,
  ): Promise<T>;

  // Specific retry methods
  retryEmbeddingGeneration(
    text: string,
    context: LogContext,
  ): Promise<number[]>;
  retryChromaDBQuery(query: any, context: LogContext): Promise<any>;
}
```

## Data Models

### Enhanced Training Metadata Schema

Stored in the database alongside existing chatbot configuration:

```typescript
interface EnhancedTrainingMetadata {
  // Existing fields
  projectId: string;
  status: "pending" | "processing" | "completed" | "failed";

  // New fields for verification
  chunkCount: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  trainedAt: Date;

  // Verification status
  verified: boolean;
  verifiedAt: Date | null;
  verificationPassed: boolean;
  verificationDetails: {
    collectionExists: boolean;
    actualChunkCount: number;
    testSearchScore: number | null;
    discrepancies: string[];
  } | null;

  // Configuration snapshot
  relevanceThreshold: number | null; // Per-chatbot override
}
```

### Log Entry Schema

For structured logging that can be queried and analyzed:

```typescript
interface RagLogEntry {
  timestamp: Date;
  requestId: string;
  projectId: string;
  stage: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data: {
    // Stage-specific data
    query?: string;
    embeddingDimensions?: number;
    embeddingSample?: number[];
    searchResultCount?: number;
    similarityScores?: number[];
    threshold?: number;
    highestScore?: number;
    idkReason?: string;
    error?: any;
  };
}
```

### Collection Metadata Schema

Stored in ChromaDB metadata for each collection:

```typescript
interface CollectionMetadata {
  projectId: string;
  createdAt: string; // ISO date
  lastUpdated: string; // ISO date
  documentCount: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chunkingStrategy: string;
  version: string; // Schema version for migrations
}
```

### Error Response Schema

Standardized error responses for the API:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string; // Technical message
    userMessage: string; // User-friendly message
    suggestion: string | null;
    debugInfo?: any; // Only in debug mode
  };
  requestId: string;
}

enum ErrorCode {
  NO_COLLECTION = "NO_COLLECTION",
  EMPTY_COLLECTION = "EMPTY_COLLECTION",
  THRESHOLD_NOT_MET = "THRESHOLD_NOT_MET",
  EMBEDDING_ERROR = "EMBEDDING_ERROR",
  CHROMADB_ERROR = "CHROMADB_ERROR",
  CONFIG_ERROR = "CONFIG_ERROR",
  DIMENSION_MISMATCH = "DIMENSION_MISMATCH",
}
```

### Debug Response Schema

Extended response format when debug mode is enabled:

```typescript
interface DebugChatResponse extends ChatResponse {
  debugInfo: {
    requestId: string;
    processingTimeMs: number;

    // Pre-query validation
    collectionStatus: {
      exists: boolean;
      documentCount: number;
      embeddingDimensions: number;
    };

    // Embedding generation
    queryEmbedding: {
      dimensions: number;
      sampleValues: number[]; // First 10
      generationTimeMs: number;
    };

    // Similarity search
    searchResults: {
      count: number;
      topScore: number | null;
      allScores: number[];
      previews: { score: number; text: string }[];
      searchTimeMs: number;
    };

    // Threshold check
    thresholdCheck: {
      threshold: number;
      highestScore: number | null;
      passed: boolean;
      margin: number;
      recommendation: string | null;
    };

    // Configuration
    config: {
      embeddingProvider: string;
      embeddingModel: string;
      relevanceThreshold: number;
    };
  };
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Logging and Observability Properties

**Property 1: Complete query logging**
_For any_ chat query processed by the system, the logs should contain the request ID, project ID, query text, and timestamp.
**Validates: Requirements 1.1, 1.7**

**Property 2: Embedding generation logging**
_For any_ embedding generation operation, the logs should contain the embedding dimensions, sample values (first 5-10), and the model/provider used.
**Validates: Requirements 1.2, 3.4**

**Property 3: Similarity search logging**
_For any_ similarity search performed, the logs should contain the number of results returned, all similarity scores, and text previews of matched chunks.
**Validates: Requirements 1.3, 5.1, 5.2**

**Property 4: Threshold check logging**
_For any_ relevance threshold check, the logs should contain the highest similarity score, the configured threshold, and whether the check passed.
**Validates: Requirements 1.4**

**Property 5: IDK reason logging**
_For any_ "I don't know" response returned, the logs should contain a specific reason code (NO_COLLECTION, THRESHOLD_NOT_MET, etc.) and relevant details.
**Validates: Requirements 1.5**

**Property 6: Collection status logging**
_For any_ query or training operation, the logs should contain the collection existence status and document count.
**Validates: Requirements 1.6, 2.6**

### Vector Store Verification Properties

**Property 7: Post-training verification**
_For any_ completed training operation, the system should verify that embeddings were stored in ChromaDB and log the actual chunk count.
**Validates: Requirements 2.1, 2.2, 7.1**

**Property 8: Pre-query collection validation**
_For any_ chat query, the system should verify the collection exists before performing similarity search.
**Validates: Requirements 2.3**

**Property 9: Training metadata persistence**
_For any_ completed training operation, the system should store metadata including chunk count, embedding model, embedding dimensions, and verification status.
**Validates: Requirements 7.4**

**Property 10: Test search verification**
_For any_ completed training operation, the system should perform a test similarity search and store the result in verification metadata.
**Validates: Requirements 7.2**

### Embedding Consistency Properties

**Property 11: Embedding model consistency**
_For any_ chat query on a trained project, the embedding model and dimensions used for the query should match the model and dimensions used during training.
**Validates: Requirements 3.1, 3.2**

**Property 12: Embedding dimension validation**
_For any_ generated embedding, the system should validate that the output dimensions match the expected dimensions from configuration.
**Validates: Requirements 3.2**

**Property 13: Embedding service validation**
_For any_ query processing, the system should validate that the embedding service is accessible before attempting to generate embeddings.
**Validates: Requirements 3.5**

### Configuration Properties

**Property 14: Threshold bounds validation**
_For any_ relevance threshold value (global or per-chatbot), the value should be between 0.0 and 1.0 inclusive.
**Validates: Requirements 4.2**

**Property 15: Threshold configuration loading**
_For any_ system startup or configuration reload, the relevance threshold should be read from the RELEVANCE_THRESHOLD environment variable or use the default value.
**Validates: Requirements 4.1**

**Property 16: Per-chatbot threshold override**
_For any_ project with a per-chatbot threshold configured, that threshold should be used instead of the global threshold.
**Validates: Requirements 4.6**

**Property 17: Startup configuration validation**
_For any_ system startup, all embedding-related environment variables should be validated before accepting requests.
**Validates: Requirements 8.1**

### Error Handling Properties

**Property 18: Specific error messages**
_For any_ error condition (missing collection, threshold not met, embedding failure, ChromaDB unreachable), the system should return a specific error message that identifies the problem.
**Validates: Requirements 2.4, 6.1, 6.3, 6.4**

**Property 19: Error message actionability**
_For any_ error response, the message should include an actionable suggestion for the user (e.g., "Upload documents first", "Try rephrasing your question").
**Validates: Requirements 6.6**

**Property 20: Threshold failure context**
_For any_ response where the relevance threshold is not met, the response should include the highest similarity score achieved (when debug mode is enabled).
**Validates: Requirements 6.2, 6.5**

**Property 21: Debug mode information**
_For any_ chat request with debug mode enabled, the response should include detailed information about collection status, embedding dimensions, search results, and threshold checks.
**Validates: Requirements 6.5**

### Recovery and Resilience Properties

**Property 22: Soft threshold warnings**
_For any_ similarity score that falls within the soft threshold margin (e.g., within 0.05 of the threshold), the system should log a warning but still provide the answer.
**Validates: Requirements 9.1**

**Property 23: Embedding retry with backoff**
_For any_ embedding generation failure, the system should retry with exponential backoff up to a maximum number of attempts.
**Validates: Requirements 9.3**

**Property 24: Force answer mode bypass**
_For any_ chat request with force answer mode enabled, the relevance threshold check should be bypassed and the best available answer returned.
**Validates: Requirements 9.4**

**Property 25: Embedding caching**
_For any_ query text that has been embedded before (within cache TTL), the system should return the cached embedding instead of calling the embedding service again.
**Validates: Requirements 9.5**

**Property 26: Search expansion for sparse results**
_For any_ similarity search that returns fewer than a minimum threshold of results (e.g., < 3), the system should attempt to expand the search to retrieve more chunks.
**Validates: Requirements 9.2**

### Training Verification Properties

**Property 27: Empty collection detection**
_For any_ training operation that completes successfully but results in an empty collection, the training status should be marked as failed.
**Validates: Requirements 7.3**

**Property 28: Chunk count discrepancy logging**
_For any_ training verification where the actual chunk count differs from the expected count, the discrepancy should be logged with details.
**Validates: Requirements 7.6**

## Error Handling

### Error Classification

Errors in the RAG pipeline are classified into the following categories:

1. **Configuration Errors**: Invalid or missing configuration (fail fast on startup)
2. **Pre-Query Validation Errors**: Collection missing, embedding service unavailable (return specific error to user)
3. **Runtime Errors**: Embedding generation failure, ChromaDB query failure (retry with backoff, then return error)
4. **Threshold Errors**: Relevance threshold not met (return "I don't know" with context)
5. **Data Integrity Errors**: Dimension mismatch, empty collection after training (mark training as failed)

### Error Handling Strategy by Stage

#### Startup Phase

```typescript
// Configuration validation
try {
  validateAllConfig();
  testChromaDBConnectivity();
  testEmbeddingService();
} catch (error) {
  logger.error("Startup validation failed", error);
  process.exit(1); // Fail fast
}
```

**Errors**:

- Missing required environment variables → Log error and exit
- Invalid threshold value → Log error and exit
- ChromaDB unreachable → Log error and exit
- Embedding service unreachable → Log error and exit

#### Pre-Query Validation Phase

```typescript
// Collection existence check
const collectionStatus =
  await vectorStoreValidator.getCollectionStatus(projectId);
if (!collectionStatus.exists) {
  return {
    success: false,
    error: {
      code: ErrorCode.NO_COLLECTION,
      message: "Collection does not exist",
      userMessage:
        "No documents have been uploaded yet. Please upload and train documents first.",
      suggestion: "Upload documents using the training interface",
    },
  };
}

if (collectionStatus.documentCount === 0) {
  return {
    success: false,
    error: {
      code: ErrorCode.EMPTY_COLLECTION,
      message: "Collection exists but contains no documents",
      userMessage:
        "Your document collection is empty. Please re-train your chatbot.",
      suggestion:
        "Try uploading documents again or contact support if the issue persists",
    },
  };
}
```

**Errors**:

- Collection does not exist → Return NO_COLLECTION error with user-friendly message
- Collection is empty → Return EMPTY_COLLECTION error with re-training suggestion
- Embedding service unavailable → Return EMBEDDING_ERROR with service status

#### Embedding Generation Phase

```typescript
// Retry with exponential backoff
try {
  const embedding = await retryHandler.retryEmbeddingGeneration(query, context);

  // Validate dimensions
  if (embedding.length !== expectedDimensions) {
    throw new DimensionMismatchError(
      `Expected ${expectedDimensions} dimensions, got ${embedding.length}`,
    );
  }

  return embedding;
} catch (error) {
  if (error instanceof DimensionMismatchError) {
    return {
      success: false,
      error: {
        code: ErrorCode.DIMENSION_MISMATCH,
        message: error.message,
        userMessage:
          "There is a configuration mismatch in your chatbot. Please re-train it.",
        suggestion: "Re-train your chatbot to fix the embedding configuration",
      },
    };
  }

  return {
    success: false,
    error: {
      code: ErrorCode.EMBEDDING_ERROR,
      message: "Failed to generate embedding after retries",
      userMessage:
        "Unable to process your query due to a temporary service issue.",
      suggestion: "Please try again in a moment",
    },
  };
}
```

**Errors**:

- Embedding service timeout → Retry with backoff (3 attempts)
- Embedding service error → Retry with backoff (3 attempts)
- Dimension mismatch → Return DIMENSION_MISMATCH error with re-training suggestion
- All retries exhausted → Return EMBEDDING_ERROR with retry suggestion

#### Similarity Search Phase

```typescript
try {
  const results = await chromaDB.query({
    collectionName: getCollectionName(projectId),
    queryEmbeddings: [embedding],
    nResults: 10,
  });

  logger.logSimilaritySearch(context, results.length, results.scores);

  if (results.length === 0) {
    logger.logIdkResponse(context, IdkReason.NO_SEARCH_RESULTS, {});
    return {
      success: true,
      answer: "I don't know",
      debugInfo: debugMode
        ? {
            reason: "No similar documents found",
            suggestion:
              "Try rephrasing your question or asking about different topics",
          }
        : undefined,
    };
  }

  return results;
} catch (error) {
  logger.logError(context, error, "similarity_search");
  return {
    success: false,
    error: {
      code: ErrorCode.CHROMADB_ERROR,
      message: "ChromaDB query failed",
      userMessage: "Unable to search your documents due to a database issue.",
      suggestion: "Please try again or contact support if the issue persists",
    },
  };
}
```

**Errors**:

- ChromaDB connection error → Return CHROMADB_ERROR with retry suggestion
- ChromaDB query timeout → Return CHROMADB_ERROR with retry suggestion
- No results found → Return "I don't know" with rephrasing suggestion (not an error)

#### Relevance Filtering Phase

```typescript
const thresholdResult = thresholdManager.checkRelevance(
  highestScore,
  projectId,
);

logger.logThresholdCheck(
  context,
  highestScore,
  thresholdResult.threshold,
  thresholdResult.passed,
);

if (request.forceAnswer) {
  logger.warn("Force answer mode enabled, bypassing threshold check");
  return { passed: true, results: allResults };
}

if (thresholdResult.shouldWarn) {
  logger.warn(
    `Score ${highestScore} is within soft margin of threshold ${thresholdResult.threshold}`,
  );
  // Still provide answer but log warning
  return { passed: true, results: passedResults };
}

if (!thresholdResult.passed) {
  logger.logIdkResponse(context, IdkReason.THRESHOLD_NOT_MET, {
    highestScore,
    threshold: thresholdResult.threshold,
    margin: thresholdResult.margin,
  });

  return {
    success: true,
    answer: "I don't know",
    debugInfo: debugMode
      ? {
          reason: "Relevance threshold not met",
          highestScore,
          threshold: thresholdResult.threshold,
          suggestion: thresholdResult.recommendation,
        }
      : undefined,
  };
}
```

**Errors**:

- Threshold not met → Return "I don't know" with score context (in debug mode)
- Threshold not met by small margin → Log warning but provide answer
- Force answer mode → Bypass threshold and provide answer

### Error Message Templates

All error messages follow this structure:

```typescript
{
  code: ErrorCode,           // Machine-readable error code
  message: string,           // Technical message for logs
  userMessage: string,       // User-friendly explanation
  suggestion: string | null, // Actionable next step
  debugInfo?: any           // Additional context (debug mode only)
}
```

**Example Error Messages**:

```typescript
// No collection
{
  code: 'NO_COLLECTION',
  message: 'Collection chatbot_project_123 does not exist',
  userMessage: 'No documents have been uploaded yet. Please upload and train documents first.',
  suggestion: 'Upload documents using the training interface'
}

// Threshold not met
{
  code: 'THRESHOLD_NOT_MET',
  message: 'Highest similarity score 0.32 below threshold 0.40',
  userMessage: "I don't know",
  suggestion: 'Try rephrasing your question or asking about topics covered in your documents',
  debugInfo: {
    highestScore: 0.32,
    threshold: 0.40,
    margin: -0.08
  }
}

// Embedding error
{
  code: 'EMBEDDING_ERROR',
  message: 'Gemini API timeout after 3 retries',
  userMessage: 'Unable to process your query due to a temporary service issue.',
  suggestion: 'Please try again in a moment'
}

// Dimension mismatch
{
  code: 'DIMENSION_MISMATCH',
  message: 'Expected 768 dimensions, got 1536',
  userMessage: 'There is a configuration mismatch in your chatbot. Please re-train it.',
  suggestion: 'Re-train your chatbot to fix the embedding configuration'
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific error scenarios, edge cases, and API endpoint behavior
- **Property tests**: Verify universal properties across all inputs (logging completeness, validation consistency, error message format)

### Property-Based Testing

We will use **fast-check** (for TypeScript/JavaScript) to implement property-based tests. Each test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Configuration**:

```typescript
import fc from "fast-check";

// Configure all property tests to run 100+ iterations
const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
};
```

**Test Tagging**:
Each property test must reference its design document property:

```typescript
describe("Feature: fix-chatbot-no-answers, Property 1: Complete query logging", () => {
  it("should log request ID, project ID, query text, and timestamp for all queries", () => {
    fc.assert(
      fc.property(
        fc.string(), // projectId
        fc.string(), // query
        async (projectId, query) => {
          // Test implementation
        },
      ),
      propertyTestConfig,
    );
  });
});
```

### Unit Testing Strategy

**Test Categories**:

1. **Configuration Validation Tests**
   - Test threshold validation with valid/invalid values
   - Test environment variable loading
   - Test default value handling
   - Test per-chatbot threshold overrides

2. **Error Message Tests**
   - Test each error code returns correct message format
   - Test user messages are present and actionable
   - Test suggestions are provided
   - Test debug info is included when debug mode enabled

3. **API Endpoint Tests**
   - Test `/api/debug/collection/:projectId` returns correct format
   - Test `/api/debug/test-query` returns debug information
   - Test `/api/health/rag` validates all dependencies
   - Test `/api/admin/verify-training/:projectId` performs verification

4. **Logging Tests**
   - Test log entries contain required fields
   - Test request ID correlation across stages
   - Test sensitive data is redacted

5. **Retry Logic Tests**
   - Test exponential backoff timing
   - Test maximum retry limit
   - Test successful retry after failure

6. **Threshold Logic Tests**
   - Test exact threshold boundary (score = threshold)
   - Test soft threshold margin behavior
   - Test force answer mode bypass

7. **Integration Tests**
   - Test complete RAG pipeline with mock ChromaDB
   - Test training verification flow
   - Test error propagation through pipeline

### Test Data Generation

For property-based tests, we need generators for:

```typescript
// Project ID generator
const projectIdArb = fc.string({ minLength: 1, maxLength: 50 });

// Query text generator
const queryArb = fc.string({ minLength: 1, maxLength: 500 });

// Similarity score generator (0.0 to 1.0)
const scoreArb = fc.float({ min: 0.0, max: 1.0 });

// Threshold generator (0.0 to 1.0)
const thresholdArb = fc.float({ min: 0.0, max: 1.0 });

// Embedding generator (array of floats)
const embeddingArb = (dimensions: number) =>
  fc.array(fc.float({ min: -1.0, max: 1.0 }), {
    minLength: dimensions,
    maxLength: dimensions,
  });

// Search result generator
const searchResultArb = fc.record({
  id: fc.string(),
  score: scoreArb,
  text: fc.string({ minLength: 10, maxLength: 1000 }),
  metadata: fc.dictionary(fc.string(), fc.anything()),
});

// Error code generator
const errorCodeArb = fc.constantFrom(
  "NO_COLLECTION",
  "EMPTY_COLLECTION",
  "THRESHOLD_NOT_MET",
  "EMBEDDING_ERROR",
  "CHROMADB_ERROR",
  "DIMENSION_MISMATCH",
);
```

### Mock Services

For testing, we need mocks for:

1. **ChromaDB Mock**: Simulates collection queries, returns configurable results
2. **Embedding Service Mock**: Returns embeddings with configurable dimensions
3. **Logger Mock**: Captures log entries for assertion
4. **Configuration Mock**: Provides test configuration values

### Test Coverage Goals

- **Line coverage**: > 90%
- **Branch coverage**: > 85%
- **Property test coverage**: All 28 properties implemented
- **Error scenario coverage**: All error codes tested
- **API endpoint coverage**: All debug/health endpoints tested

### Example Property Test

```typescript
describe("Feature: fix-chatbot-no-answers, Property 1: Complete query logging", () => {
  it("should log request ID, project ID, query text, and timestamp for all queries", () => {
    fc.assert(
      fc.property(projectIdArb, queryArb, async (projectId, query) => {
        // Arrange
        const mockLogger = new MockLogger();
        const ragService = new EnhancedRagService(mockLogger);

        // Act
        await ragService.chat({ projectId, query });

        // Assert
        const queryLogs = mockLogger.getLogsByStage("validation");
        expect(queryLogs.length).toBeGreaterThan(0);

        const log = queryLogs[0];
        expect(log.requestId).toBeDefined();
        expect(log.projectId).toBe(projectId);
        expect(log.data.query).toBe(query);
        expect(log.timestamp).toBeInstanceOf(Date);
      }),
      propertyTestConfig,
    );
  });
});
```

### Example Unit Test

```typescript
describe("Error Message Format", () => {
  it("should return specific error message when collection does not exist", async () => {
    // Arrange
    const mockVectorStore = new MockVectorStoreValidator();
    mockVectorStore.setCollectionExists(false);
    const ragService = new EnhancedRagService(mockVectorStore);

    // Act
    const response = await ragService.chat({
      projectId: "test-project",
      query: "test query",
    });

    // Assert
    expect(response.success).toBe(false);
    expect(response.error.code).toBe("NO_COLLECTION");
    expect(response.error.userMessage).toBe(
      "No documents have been uploaded yet. Please upload and train documents first.",
    );
    expect(response.error.suggestion).toBeDefined();
  });
});
```

## Implementation Notes

### Logging Implementation

Use a structured logging library (e.g., Winston, Pino) with JSON formatting:

```typescript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "rag-pipeline.log" }),
  ],
});
```

### Request ID Generation

Generate unique request IDs for correlation:

```typescript
import { v4 as uuidv4 } from "uuid";

function generateRequestId(): string {
  return uuidv4();
}
```

### ChromaDB Collection Naming

Use consistent collection naming:

```typescript
function getCollectionName(projectId: string): string {
  return `chatbot_project_${projectId}`;
}
```

### Embedding Caching

Implement a simple in-memory cache with TTL:

```typescript
import NodeCache from "node-cache";

const embeddingCache = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 600, // Check for expired entries every 10 minutes
});

function getCachedEmbedding(text: string): number[] | null {
  return embeddingCache.get(text) || null;
}

function cacheEmbedding(text: string, embedding: number[]): void {
  embeddingCache.set(text, embedding);
}
```

### Retry Configuration

Configure retry behavior:

```typescript
const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};
```

### Environment Variables

Required environment variables:

```bash
# Embedding Service
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=embedding-001
EMBEDDING_DIMENSIONS=768
GEMINI_API_KEY=your-api-key

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# RAG Configuration
RELEVANCE_THRESHOLD=0.4
SOFT_THRESHOLD_MARGIN=0.05
MIN_SEARCH_RESULTS=3
MAX_SEARCH_RESULTS=10

# Retry Configuration
EMBEDDING_MAX_RETRIES=3
EMBEDDING_RETRY_DELAY_MS=1000

# Cache Configuration
EMBEDDING_CACHE_TTL_SECONDS=3600
```

### Performance Considerations

1. **Embedding Caching**: Reduces API calls by ~70% for repeated queries
2. **Batch Embedding**: Process multiple chunks in parallel during training
3. **Connection Pooling**: Reuse ChromaDB connections
4. **Async Logging**: Don't block request processing for log writes
5. **Lazy Loading**: Only load training metadata when needed

### Security Considerations

1. **Log Sanitization**: Redact sensitive data (API keys, user PII) from logs
2. **Input Validation**: Validate all user inputs (projectId, query text)
3. **Rate Limiting**: Implement rate limiting on debug endpoints
4. **Access Control**: Restrict admin endpoints to authorized users
5. **Error Message Safety**: Don't expose internal system details in user-facing errors

### Backward Compatibility

1. **Default Threshold**: Use 0.4 as default to match existing behavior
2. **Optional Debug Mode**: Debug info only included when explicitly requested
3. **Graceful Degradation**: System works even if new features fail
4. **Configuration Migration**: Support both old and new config formats
5. **API Versioning**: New endpoints don't affect existing API routes
