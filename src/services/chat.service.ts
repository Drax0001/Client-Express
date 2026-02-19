/**
 * ChatService - Handles user queries and orchestrates RAG pipeline
 * Processes queries by validating projects, generating embeddings, searching vectors,
 * assembling context, and invoking LLM with strict knowledge restrictions
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3
 */

import { ProjectService } from "./project.service";
import { EmbeddingService } from "../lib/embedding-service";
import { VectorStore } from "../lib/vector-store";
import { LLMService } from "../lib/llm-service";
import {
  NotFoundError,
  ValidationError,
  ServiceUnavailableError,
} from "../lib/errors";
import { AppConfig, getConfig } from "../lib/config";
import { getUserApiKeys } from "../lib/user-api-key";
import { QueryRewriter } from "../lib/query-rewriter";

/**
 * Chat query request interface
 */
export interface ChatRequest {
  projectId: string;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Chat response interface
 */
export interface ChatResponse {
  answer: string;
  sourceCount: number;
}

/**
 * Service class for processing chat queries using RAG pipeline
 */
export class ChatService {
  private projectService: ProjectService;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private llmService: LLMService;
  private config = getConfig();
  private userId?: string;

  constructor(userId?: string) {
    this.projectService = new ProjectService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.llmService = new LLMService();
    this.userId = userId;
  }

  private async getActiveServices(): Promise<{
    embeddingService: EmbeddingService;
    llmService: LLMService;
    config: AppConfig;
  }> {
    if (!this.userId) {
      return {
        embeddingService: this.embeddingService,
        llmService: this.llmService,
        config: this.config,
      };
    }

    const keys = await getUserApiKeys(this.userId);
    const embeddingService = keys.embedding
      ? new EmbeddingService({ apiKey: keys.embedding })
      : this.embeddingService;
    const llmService = keys.llm
      ? new LLMService({ apiKey: keys.llm })
      : this.llmService;

    return { embeddingService, llmService, config: this.config };
  }

  /**
   * Processes a user query through the complete RAG pipeline
   *
   * This method orchestrates the entire query processing flow:
   * 1. Validates project existence
   * 2. Generates query embedding
   * 3. Performs similarity search
   * 4. Checks relevance threshold
   * 5. Assembles context if relevant
   * 6. Constructs prompts with strict instructions
   * 7. Invokes LLM
   * 8. Returns response with source count
   *
   * Requirements:
   * - 6.1: Validate project exists
   * - 6.2: Generate embedding for user message
   * - 6.3: Return error for invalid project
   * - 7.1: Similarity search filtered by project
   * - 7.2: Top 5 similar chunks
   * - 7.3: Return text and similarity score
   * - 7.4: Rank by similarity score
   * - 8.1: Identify highest similarity score
   * - 8.2: Check relevance threshold (0.75)
   * - 8.3: Assemble context if threshold met
   * - 8.4: Don't invoke LLM if threshold not met
   * - 9.1: Concatenate chunks in ranked order
   * - 9.2: Respect token limits
   * - 9.3: Truncate preserving ranking
   * - 10.1: System prompt with knowledge restriction
   * - 10.2: Exact fallback instruction "I don't know"
   * - 10.3: User prompt with context and question
   * - 10.4: Temperature ≤ 0.3
   * - 11.1: Return LLM output verbatim
   * - 11.2: Include source chunk count
   * - 11.3: Consistent JSON response format
   *
   * @param request - The chat request containing projectId and message
   * @returns Promise<ChatResponse> - The response with answer and source count
   * @throws NotFoundError if project does not exist
   * @throws ValidationError if request is invalid
   * @throws ServiceUnavailableError if external services are unavailable
   */
  async processQuery(request: ChatRequest): Promise<ChatResponse> {
    const { projectId, message, conversationHistory } = request;
    const { embeddingService, llmService, config } =
      await this.getActiveServices();

    // Validate request
    if (!projectId || !projectId.trim()) {
      throw new ValidationError("Project ID is required");
    }

    if (!message || !message.trim()) {
      throw new ValidationError("Message is required");
    }

    // 6.1: Validate that the project exists
    try {
      await this.projectService.getProject(projectId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError(`Project '${projectId}' not found`);
      }
      throw error;
    }

    // Rewrite query with conversation context for better retrieval
    let searchMessage = message;
    if (conversationHistory && conversationHistory.length > 0) {
      try {
        const queryRewriter = new QueryRewriter(llmService);
        searchMessage = await queryRewriter.rewriteQuery(
          message,
          conversationHistory.map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        );
        console.log(`ChatService: query rewritten from "${message.substring(0, 50)}..." to "${searchMessage.substring(0, 50)}..."`);
      } catch (error) {
        console.warn("ChatService: query rewriting failed, using original message", error);
        searchMessage = message;
      }
    }

    // 6.2: Generate embedding for the (rewritten) user message
    let queryEmbedding: number[];
    try {
      const embedStart = Date.now();
      // Timeout embedding if it takes too long
      queryEmbedding = await this.withTimeout(
        embeddingService.generateEmbedding(searchMessage),
        10000,
        "embedding",
      );
      console.log(`ChatService: embedding took ${Date.now() - embedStart}ms`);
    } catch (error) {
      console.error("ChatService: embedding error:", error);
      throw new ServiceUnavailableError("Unable to process query embedding");
    }

    // 7.1, 7.2, 7.3, 7.4: Perform similarity search
    let searchResults;
    try {
      const searchStart = Date.now();
      searchResults = await this.withTimeout(
        this.vectorStore.similaritySearch(projectId, queryEmbedding, 15),
        8000,
        "similaritySearch",
      );
      console.log(
        `ChatService: similarity search took ${Date.now() - searchStart}ms`,
      );
    } catch (error) {
      console.error("ChatService: similarity search error:", error);
      throw new ServiceUnavailableError("Unable to perform similarity search");
    }

    // 8.1, 8.2: Check relevance threshold
    const highestScore = searchResults.length > 0 ? searchResults[0].score : 0;
    const relevanceThreshold = config.processing.relevanceThreshold; // 0.75

    console.log("ChatService: retrieval stats", {
      results: searchResults.length,
      highestScore,
      relevanceThreshold,
    });

    if (highestScore < relevanceThreshold) {
      // 8.4: Don't invoke LLM if threshold not met
      console.log("ChatService: below relevance threshold; returning IDK", {
        highestScore,
        relevanceThreshold,
      });
      return {
        answer: "I don't know",
        sourceCount: 0,
      };
    }

    // Count unique documents from search results
    const uniqueDocumentIds = new Set(
      searchResults
        .map((result) => result.metadata?.documentId)
        .filter((id) => id != null)
    );
    const sourceCount = uniqueDocumentIds.size;

    // 8.3: Assemble context if threshold met
    const context = this.assembleContext(searchResults);

    // 10.1, 10.2, 10.3: Construct prompts
    const systemPrompt = `You are a knowledgeable assistant answering questions based ONLY on the provided context documents.

RULES:
1. Answer ONLY using information from the provided context
2. When you reference information, ALWAYS cite the source using [Source: filename/url] format shown in the context
3. If information spans multiple sources, synthesize them and cite each
4. If the answer is partially in the context, share what you can and note what's missing
5. If the answer is NOT in the context at all, say: "I don't have enough information in the provided documents to answer this question."
6. For follow-up questions, use the conversation history to maintain context
7. Be detailed and thorough — users uploaded these documents for comprehensive answers`;

    // Build conversation context from history
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = "\n\nPrevious conversation:\n" +
        conversationHistory.map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n") +
        "\n\n";
    }

    const userPrompt = `Context (each block is tagged with its source document):
${context}

${conversationContext}Current question: ${message}

Answer the question based on the context provided above. Cite your sources.`;

    // 10.4: Invoke LLM (temperature already constrained in LLMService)
    let llmResponse: string;
    try {
      const llmStart = Date.now();
      // Allow a longer timeout for LLM
      llmResponse = await this.withTimeout(
        llmService.generateResponse(systemPrompt, userPrompt),
        60000,
        "llm",
      );
      console.log(
        `ChatService: LLM generation took ${Date.now() - llmStart}ms`,
      );
    } catch (error) {
      console.error("ChatService: LLM error:", error);
      throw new ServiceUnavailableError("Unable to generate response");
    }

    // 11.1, 11.2, 11.3: Return response verbatim with source count
    return {
      answer: llmResponse,
      sourceCount,
    };
  }

  /**
   * Helper to apply a timeout to a promise and annotate errors
   */
  private async withTimeout<T>(
    p: Promise<T>,
    ms: number,
    name = "operation",
  ): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, rej) => {
      timer = setTimeout(
        () => rej(new Error(`${name} timeout after ${ms}ms`)),
        ms,
      );
    });

    try {
      return await Promise.race([p, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Assembles context from search results with token limit consideration
   *
   * Requirements:
   * - 9.1: Concatenate in ranked order
   * - 9.2: Respect token limits
   * - 9.3: Truncate preserving ranking
   *
   * @param searchResults - The ranked search results
   * @returns The assembled context string
   * @private
   */
  private assembleContext(
    searchResults: Array<{ text: string; score: number; metadata?: Record<string, any> }>,
  ): string {
    // Simple token estimation: ~4 characters per token
    const maxContextTokens = 6000; // Increased to capture more relevant context
    const maxContextChars = maxContextTokens * 4;

    let context = "";
    let includedChunks = 0;

    // 9.1: Concatenate in ranked order (results are already sorted by score)
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

      // 9.2: Check if adding this chunk would exceed limits
      if (newContext.length > maxContextChars) {
        break; // 9.3: Truncate preserving ranking
      }

      context = newContext;
      includedChunks++;
    }

    return context || "No relevant context found.";
  }
}
