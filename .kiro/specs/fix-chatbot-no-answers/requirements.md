# Requirements Document: Fix Chatbot "I don't know" Issue

## Introduction

This document specifies the requirements for diagnosing and fixing a critical bug where chatbots consistently return "I don't know" responses regardless of the query content, even when relevant documents have been uploaded and trained. This prevents users from getting any useful answers from their trained chatbots.

## Problem Statement

Users report that after uploading documents and completing training, their chatbots respond with "I don't know" to all queries, including questions that should be answerable from the uploaded content. This renders the chatbot system unusable.

## Root Cause Analysis Areas

Based on code review, the "I don't know" response can be triggered by several failure points in the RAG pipeline:

1. **Relevance Threshold Too High**: The similarity score threshold (default 0.75, but config shows 0.4) may be too strict
2. **Empty Vector Store**: Documents may not have been properly embedded and stored in ChromaDB
3. **Embedding Mismatch**: Query embeddings may use different dimensions/models than document embeddings
4. **Collection Not Found**: The project-specific ChromaDB collection may not exist
5. **Similarity Search Failure**: Vector search may be returning no results or very low scores
6. **Configuration Issues**: Environment variables may be misconfigured

## Glossary

- **Relevance Threshold**: Minimum similarity score (0-1) required to provide an answer instead of "I don't know"
- **Similarity Score**: Cosine similarity between query embedding and document chunk embeddings
- **Vector Store**: ChromaDB database storing document embeddings
- **Collection**: Project-specific namespace in ChromaDB for isolated document storage
- **Embedding Dimension**: Size of the vector representation (e.g., 768 for Gemini)

## Requirements

### Requirement 1: Diagnostic Logging and Visibility

**User Story:** As a developer, I want comprehensive logging of the RAG pipeline, so that I can identify where the "I don't know" response is being triggered.

#### Acceptance Criteria

1. WHEN a chat query is processed, THE system SHALL log the projectId and query text
2. WHEN embedding generation occurs, THE system SHALL log the embedding dimensions and first few values
3. WHEN similarity search is performed, THE system SHALL log the number of results returned and their similarity scores
4. WHEN the relevance threshold check occurs, THE system SHALL log the highest similarity score and the configured threshold
5. WHEN "I don't know" is returned, THE system SHALL log the specific reason (threshold not met, no results, error, etc.)
6. THE system SHALL log ChromaDB collection existence and document count for the project
7. THE system SHALL include timestamps and request IDs for correlation

### Requirement 2: Vector Store Verification

**User Story:** As a system, I want to verify that documents are properly stored in the vector database, so that I can ensure queries have data to search against.

#### Acceptance Criteria

1. WHEN training completes, THE system SHALL verify that embeddings were successfully stored in ChromaDB
2. WHEN training completes, THE system SHALL log the total number of chunks stored in the collection
3. WHEN a chat query is received, THE system SHALL verify the collection exists before performing similarity search
4. IF the collection does not exist, THE system SHALL return a specific error message indicating no documents are available
5. THE system SHALL provide an API endpoint to check collection status and document count for a project
6. THE system SHALL log collection metadata including creation time and document count

### Requirement 3: Embedding Consistency Validation

**User Story:** As a system, I want to ensure query embeddings match document embeddings, so that similarity search produces meaningful results.

#### Acceptance Criteria

1. WHEN generating query embeddings, THE system SHALL use the same embedding model as document embeddings
2. WHEN generating query embeddings, THE system SHALL verify the output dimensions match the configured dimensions
3. IF embedding dimensions mismatch, THE system SHALL return a specific error message
4. THE system SHALL log the embedding model and provider being used for both training and queries
5. THE system SHALL validate that the embedding service is accessible before processing queries

### Requirement 4: Relevance Threshold Configuration

**User Story:** As a system administrator, I want to configure and understand the relevance threshold, so that I can tune it for optimal results.

#### Acceptance Criteria

1. THE system SHALL read the relevance threshold from the RELEVANCE_THRESHOLD environment variable
2. THE system SHALL validate that the threshold is between 0.0 and 1.0
3. THE system SHALL log the configured threshold value on startup
4. THE system SHALL provide clear documentation on what the threshold means and how to tune it
5. IF no threshold is configured, THE system SHALL use a sensible default (0.4 or lower for initial testing)
6. THE system SHALL allow per-chatbot threshold configuration in the training config

### Requirement 5: Similarity Search Debugging

**User Story:** As a developer, I want detailed information about similarity search results, so that I can understand why queries are not matching documents.

#### Acceptance Criteria

1. WHEN similarity search is performed, THE system SHALL log all returned results with their scores
2. WHEN similarity search returns results, THE system SHALL log a preview of the matched text (first 100 characters)
3. WHEN similarity search returns no results, THE system SHALL log a specific message indicating empty results
4. THE system SHALL log the query embedding vector length and sample values
5. THE system SHALL provide a debug endpoint that shows sample embeddings from the collection
6. THE system SHALL log ChromaDB query parameters (nResults, include fields, etc.)

### Requirement 6: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when my chatbot cannot answer, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN no documents are found in the collection, THE system SHALL return "No documents have been uploaded yet. Please upload and train documents first."
2. WHEN the relevance threshold is not met, THE system SHALL return "I don't know" with additional context about the highest similarity score
3. WHEN embedding generation fails, THE system SHALL return a specific error message about the embedding service
4. WHEN ChromaDB is unreachable, THE system SHALL return a specific error message about the vector database
5. THE system SHALL include a "debug" flag in responses that shows similarity scores when enabled
6. THE system SHALL provide actionable suggestions in error messages (e.g., "Try rephrasing your question")

### Requirement 7: Training Verification

**User Story:** As a system, I want to verify that training completed successfully, so that I can ensure documents are ready for querying.

#### Acceptance Criteria

1. WHEN training completes, THE system SHALL verify that at least one chunk was successfully embedded
2. WHEN training completes, THE system SHALL perform a test similarity search to verify the collection is queryable
3. IF training appears successful but the collection is empty, THE system SHALL mark the training as failed
4. THE system SHALL store training metadata including chunk count and embedding model used
5. THE system SHALL provide an API endpoint to re-verify training status for a chatbot
6. THE system SHALL log any discrepancies between expected and actual chunk counts

### Requirement 8: Configuration Validation

**User Story:** As a system administrator, I want to validate that all required configuration is correct, so that I can prevent runtime errors.

#### Acceptance Criteria

1. WHEN the application starts, THE system SHALL validate all embedding-related environment variables
2. WHEN the application starts, THE system SHALL test connectivity to ChromaDB
3. WHEN the application starts, THE system SHALL test the embedding service with a sample text
4. IF any configuration is invalid, THE system SHALL log specific error messages and fail to start
5. THE system SHALL provide a health check endpoint that validates all external dependencies
6. THE system SHALL log the complete configuration (with sensitive values redacted) on startup

### Requirement 9: Fallback and Recovery

**User Story:** As a user, I want the system to attempt recovery when issues are detected, so that I can get answers even when there are minor problems.

#### Acceptance Criteria

1. WHEN the relevance threshold is not met by a small margin (e.g., 0.05), THE system SHALL log a warning but still provide the answer
2. WHEN similarity search returns very few results, THE system SHALL attempt to expand the search to more chunks
3. WHEN embedding generation fails, THE system SHALL retry with exponential backoff
4. THE system SHALL provide a "force answer" mode that bypasses the relevance threshold for debugging
5. THE system SHALL cache successful embeddings to reduce API calls
6. THE system SHALL provide a manual re-training option for failed chatbots

### Requirement 10: Testing and Validation Tools

**User Story:** As a developer, I want tools to test the RAG pipeline, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. THE system SHALL provide a test endpoint that accepts a projectId and returns collection statistics
2. THE system SHALL provide a test endpoint that performs a sample query and returns detailed debug information
3. THE system SHALL provide a script to verify ChromaDB connectivity and list all collections
4. THE system SHALL provide a script to test embedding generation with sample text
5. THE system SHALL provide a script to verify that a specific project has documents in ChromaDB
6. THE system SHALL include unit tests for the relevance threshold logic
7. THE system SHALL include integration tests for the complete RAG pipeline

## Success Criteria

The fix will be considered successful when:

1. Users can ask questions about their uploaded documents and receive relevant answers
2. "I don't know" responses only occur when the question is genuinely not answerable from the documents
3. Clear error messages guide users when there are configuration or data issues
4. Developers can quickly diagnose RAG pipeline issues using logs and debug endpoints
5. The system provides visibility into similarity scores and threshold decisions

## Out of Scope

- Improving the quality of LLM responses (this is about fixing the "I don't know" bug, not improving answer quality)
- Adding new document types or processing methods
- Changing the fundamental RAG architecture
- Implementing advanced retrieval techniques (hybrid search, re-ranking, etc.)
