/**
 * Query Rewriter Module
 *
 * Uses the LLM to rewrite user queries with conversation context,
 * so that follow-up questions like "tell me more about that" or
 * "what about pricing?" are resolved to self-contained queries
 * before embedding and similarity search.
 *
 * This dramatically improves retrieval quality for multi-turn conversations.
 */

import { LLMService } from "./llm-service";

export interface ConversationMessage {
    role: "user" | "assistant";
    content: string;
}

export class QueryRewriter {
    private llmService: LLMService;

    constructor(llmService?: LLMService) {
        this.llmService = llmService || new LLMService();
    }

    /**
     * Rewrites a user query to be self-contained by incorporating
     * relevant context from conversation history.
     *
     * If there's no history, returns the original message unchanged.
     * If the message is already self-contained (no pronouns, no references),
     * the LLM should return it as-is.
     *
     * @param currentMessage - The latest user message
     * @param conversationHistory - Previous messages in the conversation
     * @returns A self-contained rewritten query for embedding
     */
    async rewriteQuery(
        currentMessage: string,
        conversationHistory: ConversationMessage[],
    ): Promise<string> {
        // No history = nothing to rewrite
        if (!conversationHistory || conversationHistory.length === 0) {
            return currentMessage;
        }

        // If the message already looks self-contained (long, specific), skip rewriting
        if (this.isLikelySelfContained(currentMessage)) {
            return currentMessage;
        }

        try {
            // Only use last 10 messages (5 turns) to keep context focused
            const recentHistory = conversationHistory.slice(-10);

            const systemPrompt = `You are a query rewriter. Your job is to rewrite the user's latest question so it is fully self-contained and includes all necessary context from the conversation history.

RULES:
1. Output ONLY the rewritten question — no explanations, no preamble
2. If the question is already self-contained, return it unchanged
3. Resolve pronouns ("it", "that", "they") to their actual referents from context
4. Include relevant topic/entity names from the conversation
5. Keep the rewritten question concise but complete
6. Do NOT answer the question — only rewrite it`;

            const historyText = recentHistory
                .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
                .join("\n");

            const userPrompt = `Conversation so far:
${historyText}

Latest question: ${currentMessage}

Rewritten self-contained question:`;

            const rewritten = await this.llmService.generateResponse(
                systemPrompt,
                userPrompt,
            );

            // Validate the rewritten query is reasonable
            const cleaned = rewritten.trim();
            if (!cleaned || cleaned.length > currentMessage.length * 5) {
                // If rewrite failed or is absurdly long, fall back to original
                return currentMessage;
            }

            return cleaned;
        } catch (error) {
            // If rewriting fails, fall back to original message
            console.warn("Query rewriting failed, using original message:", error);
            return currentMessage;
        }
    }

    /**
     * Heuristic check: does the message look self-contained?
     * Messages that are long, contain specific nouns, and lack pronouns
     * probably don't need rewriting.
     */
    private isLikelySelfContained(message: string): boolean {
        const words = message.split(/\s+/);

        // Very short messages are likely follow-ups
        if (words.length < 4) return false;

        // Check for common follow-up indicators
        const followUpPatterns = [
            /^(what|how|why|where|when|who)\s+(about|is|are|was|were)\s+(it|that|this|those|these|them)/i,
            /^(tell|explain|describe|show)\s+(me\s+)?(more|again)/i,
            /^(yes|no|ok|sure|and|but|also|what about)/i,
            /^(can you|could you|please)\s+(elaborate|expand|clarify)/i,
        ];

        for (const pattern of followUpPatterns) {
            if (pattern.test(message.trim())) return false;
        }

        // Long, specific queries with 8+ words are usually self-contained
        if (words.length >= 8) return true;

        return false; // Default to attempting rewrite
    }
}
