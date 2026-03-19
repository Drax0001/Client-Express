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
import { QueryRewriter } from "../lib/query-rewriter";
import { prisma } from "../../lib/prisma";

/**
 * Chat query request interface
 */
export interface ChatRequest {
  projectId: string;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  userContext?: Record<string, unknown> | null;
}

/**
 * Individual source returned with a chat response
 */
export interface ChatSource {
  title: string;
  snippet: string;
  relevanceScore: number;
  url?: string;
}

/**
 * Chat response interface
 */
export interface ChatResponse {
  answer: string;
  sourceCount: number;
  sources?: ChatSource[];
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
    return {
      embeddingService: this.embeddingService,
      llmService: this.llmService,
      config: this.config,
    };
  }

  // private async getActiveServices(): Promise<{
  //   embeddingService: EmbeddingService;
  //   llmService: LLMService;
  //   config: AppConfig;
  // private async getServices(): Promise<{
  //   embeddingService: EmbeddingService;
  //   llmService: LLMService;
  //   config: AppConfig;
  // }> {
  //   return {
  //     embeddingService: this.embeddingService,
  //     llmService: this.llmService,
  //     config: this.config,
  //   };
  // }

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
    const { projectId, message, conversationHistory, userContext } = request;
    const { embeddingService, llmService, config } =
      await this.getActiveServices();

    // Validate request
    if (!projectId || !projectId.trim()) {
      throw new ValidationError("Project ID is required");
    }

    if (!message || !message.trim()) {
      throw new ValidationError("Message is required");
    }

    // 6.1: Validate that the project exists and load bot config
    let project: any;
    try {
      project = await prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          modelId: true,
          systemPrompt: true,
          temperature: true,
          maxTokens: true,
          persona: true,
          instructions: true,
          responseStyle: true,
          contextMessage: true,
        },
      });
    } catch (error) {
      throw new NotFoundError(`Project '${projectId}' not found`);
    }

    // Extract bot config
    const botConfig = {
      modelId: project.modelId || "gemini-2.5-flash",
      temperature: project.temperature ?? 0.4,
      maxTokens: project.maxTokens ?? 5000,
      persona: project.persona || null,
      instructions: project.instructions || null,
      responseStyle: (project.responseStyle || "balanced") as "concise" | "balanced" | "detailed",
      customSystemPrompt: project.systemPrompt || null,
    };

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
        console.log(
          `ChatService: query rewritten from "${message.substring(0, 50)}..." to "${searchMessage.substring(0, 50)}..."`,
        );
      } catch (error) {
        console.warn(
          "ChatService: query rewriting failed, using original message",
          error,
        );
        searchMessage = message;
      }
    }

    // Enrich user message with context message if configured
    const enrichedMessage = project.contextMessage
      ? `${message}\n\n[Context: ${project.contextMessage}]`
      : message;

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
    const isEmptyCollection = searchResults.length === 0;
    const highestScore = searchResults.length > 0 ? searchResults[0].score : 0;
    const relevanceThreshold = config.processing.relevanceThreshold; // 0.75

    console.log("ChatService: retrieval stats", {
      results: searchResults.length,
      highestScore,
      relevanceThreshold,
      isEmptyCollection,
    });

    // Check if project has no documents uploaded
    if (isEmptyCollection) {
      console.log(
        "ChatService: no documents in project; returning helpful message",
        {
          projectId,
        },
      );
      return {
        answer:
          "I don't have any documents to answer your question. Please upload some documents to this project first, then I can help you answer questions about them.",
        sourceCount: 0,
        sources: [],
      };
    }

    // Two-tier relevance: confident (>= threshold) vs low-confidence (>= 0.25)
    const lowConfidenceThreshold = 0.25;
    const isConfident = highestScore >= relevanceThreshold;
    const hasPartialMatch = highestScore >= lowConfidenceThreshold;

    // Count unique documents from search results
    const uniqueDocumentIds = new Set(
      searchResults
        .map((result) => result.metadata?.documentId)
        .filter((id) => id != null),
    );
    const sourceCount = uniqueDocumentIds.size;

    // Build sources array from top results
    const sources: ChatSource[] = searchResults
      .filter((r) => r.score >= lowConfidenceThreshold)
      .slice(0, 5)
      .map((r) => {
        const meta = r.metadata || {};
        const title = meta.filename || meta.sourceUrl || "Document";
        const rawSnippet = r.text?.trim() || "";
        const snippet =
          rawSnippet.length > 250
            ? rawSnippet.substring(0, 250) + "..."
            : rawSnippet;
        return {
          title,
          snippet,
          relevanceScore: r.score,
          url: meta.sourceUrl as string | undefined,
        };
      });

    // Assemble context from search results
    const context = hasPartialMatch ? this.assembleContext(searchResults) : "";

    // Response style instruction
    const styleInstruction = {
      concise: "Keep your responses concise and to the point. Use short paragraphs and bullet points.",
      balanced: "Provide thorough but well-organized responses. Use formatting like headers, bullet points, and numbered lists when helpful.",
      detailed: "Provide comprehensive, in-depth responses. Cover all angles, include examples, and be thorough in your explanations.",
    }[botConfig.responseStyle];

    // Build persona section
    const personaSection = botConfig.persona
      ? `\nYour persona: ${botConfig.persona}`
      : "";

    // Build custom instructions section
    const instructionsSection = botConfig.instructions
      ? `\n\nADDITIONAL INSTRUCTIONS FROM THE PROJECT OWNER:\n${botConfig.instructions}`
      : "";

    // Build user context prefix (Feature 11 — personalization)
    const userContextPrefix = userContext
      ? `Current user context: ${JSON.stringify(userContext)}\n\n`
      : "";

    // Build the system prompt based on confidence level
    let systemPrompt: string;

    if (botConfig.customSystemPrompt) {
      // User provided a full custom system prompt override
      systemPrompt = userContextPrefix
        + botConfig.customSystemPrompt
        + `\n\nIMPORTANT: ALWAYS respond in the SAME LANGUAGE as the user's question.`
        + personaSection
        + instructionsSection;
    } else if (isConfident) {
      // Full-confidence prompt
      systemPrompt = userContextPrefix + `You are a knowledgeable, warm, and professional expert assistant. You possess the knowledge contained in the provided context naturally.${personaSection}

CORE RULES:
1. Answer authoritatively using the information from the context. Synthesize information across multiple sources when relevant.
2. DO NOT say "According to the documents" or "The text provided says". Treat the information as your own established knowledge.
3. If the answer is partially in the context, share what you know confidently and note what additional details you lack.
4. **LANGUAGE MATCHING IS STRICT:** ALWAYS respond in the EXACT SAME LANGUAGE as the user's question. If the user asks in French, respond in flawless French. The context documents may be in a different language — translate seamlessly.
5. ${styleInstruction}
6. **RICH FORMATTING:** Use markdown effectively. Structure your answer using markdown headings (###), bold text for emphasis, bullet points, and proper paragraph spacing to make the answer easy to scan and read.
7. At the end of your response, suggest 1-2 related follow-up questions the user might want to ask, formatted as: "**You might also want to ask:** ..."
8. Do NOT cite or reference source filenames or URLs directly in your answer.
9. Use a professional but conversational tone — be the expert the user is consulting.${instructionsSection}`;
    } else if (hasPartialMatch) {
      // Low-confidence prompt — still helpful
      systemPrompt = userContextPrefix + `You are a helpful, warm, and professional expert assistant. The user asked a question and your internal knowledge base has only partial relevance. Your job is to still be as helpful as possible without breaking character.${personaSection}

RULES:
1. Review your knowledge carefully. Even if it's not a perfect match, extract and share ANY useful information that relates to the user's question confidently.
2. DO NOT say "According to the documents" or "The text provided says".
3. **LANGUAGE MATCHING IS STRICT:** ALWAYS respond in the EXACT SAME LANGUAGE as the user's question.
4. **RICH FORMATTING:** Use markdown effectively (headings, bold, lists, proper spacing).
5. Be transparent: if the information is limited, say so politely, but still share what you know.
6. Suggest 2-3 specific, related questions the user could ask that you might know more about.
7. ${styleInstruction}
8. Encourage the user to rephrase or ask more specific questions.
9. NEVER just say "I don't know" — always provide value, guidance, and suggestions.${instructionsSection}`;
    } else {
      // No relevant context at all — still be helpful
      systemPrompt = userContextPrefix + `You are a helpful, warm, and professional assistant. The user asked a question but no relevant information was found in the available documents.${personaSection}

RULES:
1. ALWAYS respond in the SAME LANGUAGE as the user's question.
2. Politely explain that the specific information wasn't found in the uploaded documents.
3. Suggest 2-3 alternative questions the user could try that might relate to the document content.
4. Encourage the user to upload additional documents if the topic isn't covered.
5. Be genuinely helpful — offer guidance on how to get the most out of the assistant.
      6. NEVER give a flat "I don't know" — always provide actionable suggestions.${instructionsSection}`;
    }

    // Ensure multilingual support is active
    systemPrompt += "\n\nIMPORTANT: Always detect the language of the user's message and respond in that same language. Do not default to English unless the user writes in English.";

    // Build conversation context from history
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext =
        "\n\nPrevious conversation:\n" +
        conversationHistory
          .map(
            (msg) =>
              `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
          )
          .join("\n") +
        "\n\n";
    }

    let userPrompt: string;
    if (hasPartialMatch) {
      userPrompt = `Context (each block is tagged with its source document):
${context}

${conversationContext}Current question: ${enrichedMessage}

Respond in the same language as the question above. Provide a thorough, well-structured answer with follow-up suggestions.`;
    } else {
      userPrompt = `${conversationContext}The user asked: ${enrichedMessage}

No relevant context was found in the uploaded documents. Respond in the same language as the question. Be helpful and suggest what the user could try instead.`;
    }

    // Invoke LLM with project-specific model config
    let llmResponse: string;
    try {
      const llmStart = Date.now();
      llmResponse = await this.withTimeout(
        llmService.generateResponse(systemPrompt, userPrompt, {
          modelId: botConfig.modelId,
          temperature: botConfig.temperature,
          maxTokens: botConfig.maxTokens,
        }),
        60000,
        "llm",
      );
      console.log(
        `ChatService: LLM generation took ${Date.now() - llmStart}ms (model: ${botConfig.modelId})`,
      );
    } catch (error) {
      console.error("ChatService: LLM error:", error);
      throw new ServiceUnavailableError("Unable to generate response");
    }

    // Return response with source count and sources
    return {
      answer: llmResponse,
      sourceCount: isConfident ? sourceCount : 0,
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
    searchResults: Array<{
      text: string;
      score: number;
      metadata?: Record<string, any>;
    }>,
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
