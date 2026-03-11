/**
 * LLM Service Module
 *
 * This module provides an interface to Large Language Models (LLMs) for generating
 * responses based on retrieved context. It supports both Google Gemini and local LLM endpoints.
 *
 * Requirements: 10.4, 11.1, 15.1, 15.2
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AppConfig, LLMConfig, getConfig } from "./config";
import {
  LLMError,
  QuotaExceededError,
  TimeoutError,
  ServiceUnavailableError,
} from "./errors";
import { CircuitBreaker, withRetryAndCircuitBreaker } from "./retry";

// For local LLM endpoints
interface LocalLLMRequest {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface LocalLLMResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * Calls a local LLM endpoint via HTTP
 * @private
 */
// NOTE: `callLocalLLM` is implemented as a class method inside `LLMService` below.

/**
 * LLMService class
 * Handles LLM invocation with strict configuration to prevent hallucinations
 */
export class LLMService {
  private model: ChatGoogleGenerativeAI | null = null;
  private config: AppConfig;
  private circuitBreaker: CircuitBreaker;
  private isLocalProvider: boolean = false;
  private activeModelId: string | null = null;

  constructor(override?: Partial<LLMConfig>) {
    const config = getConfig();
    this.config = override ? { ...config, llm: { ...config.llm, ...override } } : config;
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Initializes the LLM model based on configuration.
   * Re-initializes if the requested modelId differs from the active one.
   * @private
   */
  private initializeModel(
    modelId?: string,
    temperatureOverride?: number,
    maxTokensOverride?: number,
  ): ChatGoogleGenerativeAI | null {
    const { llm } = this.config;

    if (llm.provider === "gemini") {
      const requestedModel = modelId || llm.modelName;

      // Re-use existing model if same modelId
      if (this.model && this.activeModelId === requestedModel) {
        return this.model;
      }

      if (!llm.apiKey) {
        throw new LLMError("Google API key is required for Gemini provider");
      }

      // Allow configurable temperature up to 0.8
      const temperature = Math.min(
        temperatureOverride ?? llm.temperature,
        0.8,
      );

      this.model = new ChatGoogleGenerativeAI({
        apiKey: llm.apiKey,
        model: requestedModel,
        temperature,
        maxOutputTokens: maxTokensOverride ?? llm.maxTokens,
      });
      this.activeModelId = requestedModel;
      this.isLocalProvider = false;
      return this.model;
    } else if (llm.provider === "local") {
      // For local LLM endpoints, we use HTTP client
      this.isLocalProvider = true;
      return null;
    } else {
      throw new LLMError(`Unsupported LLM provider: ${llm.provider}`);
    }
  }

  /**
   * Calls a local LLM endpoint via HTTP
   * @private
   */
  private async callLocalLLM(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const { llm } = this.config;

    if (!llm.endpoint) {
      throw new LLMError("Local LLM endpoint is required for local provider");
    }

    const request: LocalLLMRequest = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: Math.min(llm.temperature, 0.3),
      max_tokens: llm.maxTokens,
    };

    try {
      const response = await fetch(llm.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new LLMError(
          `Local LLM request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: LocalLLMResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new LLMError("Invalid response from local LLM");
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Failed to call local LLM: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Generates a response from the LLM based on system and user prompts
   *
   * Supports dynamic model selection via optional params.
   *
   * @param systemPrompt - Instructions for the LLM on how to behave
   * @param userPrompt - The user's question with assembled context
   * @param options - Optional: modelId, temperature, maxTokens for per-project config
   * @returns The LLM's response as a string
   * @throws LLMError if the LLM invocation fails
   * @throws QuotaExceededError if API quota is exceeded
   * @throws TimeoutError if the request times out
   */
  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    options?: { modelId?: string; temperature?: number; maxTokens?: number },
  ): Promise<string> {
    try {
      const response = await withRetryAndCircuitBreaker(async () => {
        // Initialize model with optional overrides
        this.initializeModel(
          options?.modelId,
          options?.temperature,
          options?.maxTokens,
        );

        if (this.isLocalProvider) {
          // Use local LLM endpoint
          return await this.callLocalLLM(systemPrompt, userPrompt);
        } else {
          // Use Gemini
          const model = this.model!;
          const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
          ];

          const result = await model.invoke(messages);

          return typeof result.content === "string"
            ? result.content
            : String(result.content);
        }
      }, this.circuitBreaker);

      return response;
    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes("Circuit breaker is OPEN")) {
        throw new ServiceUnavailableError(
          "LLM service temporarily unavailable",
        );
      }

      if (error.message?.includes("quota")) {
        throw new QuotaExceededError("LLM API quota exceeded");
      }

      if (error.message?.includes("timeout")) {
        throw new TimeoutError("LLM request timed out");
      }

      // Generic LLM error
      throw new LLMError(
        `Failed to generate response: ${error.message || "Unknown error"}`,
      );
    }
  }

  /**
   * Resets the model instance
   * Useful for testing or when configuration changes
   */
  resetModel(): void {
    this.model = null;
  }
}
