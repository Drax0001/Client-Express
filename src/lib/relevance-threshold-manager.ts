/**
 * Relevance Threshold Manager Module
 *
 * Manages and validates relevance threshold configuration with per-chatbot overrides.
 * Provides threshold checking with soft margin support for near-miss scenarios.
 *
 * Requirements: 4.1, 4.2, 4.5, 4.6
 */

import { getConfig } from "./config";
import { prisma } from "../../lib/prisma";

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
  global: number;
  perChatbot: Map<string, number>;
  softThresholdMargin: number; // e.g., 0.05 for warnings
}

/**
 * Result of a relevance check
 */
export interface RelevanceCheckResult {
  passed: boolean;
  score: number;
  threshold: number;
  margin: number; // How far above/below threshold
  shouldWarn: boolean; // True if within soft margin
  recommendation: string | null;
}

/**
 * RelevanceThresholdManager class
 * Manages relevance threshold configuration and checking
 */
export class RelevanceThresholdManager {
  private config: ThresholdConfig;

  constructor() {
    this.config = this.loadThresholdConfig();
  }

  /**
   * Loads threshold configuration from environment variables
   * Requirement 4.1: Read threshold from RELEVANCE_THRESHOLD environment variable
   * Requirement 4.5: Use sensible default if not configured
   *
   * @returns ThresholdConfig with global and per-chatbot thresholds
   */
  loadThresholdConfig(): ThresholdConfig {
    const appConfig = getConfig();
    const globalThreshold = appConfig.processing.relevanceThreshold;

    // Load soft threshold margin from environment or use default
    const softThresholdMargin = parseFloat(
      process.env.SOFT_THRESHOLD_MARGIN || "0.05",
    );

    return {
      global: globalThreshold,
      perChatbot: new Map<string, number>(),
      softThresholdMargin,
    };
  }

  /**
   * Gets the threshold for a specific project/chatbot
   * Requirement 4.6: Allow per-chatbot threshold configuration
   *
   * @param projectId - The project/chatbot identifier
   * @returns The threshold value to use (per-chatbot override or global)
   */
  async getThresholdForProject(projectId: string): Promise<number> {
    // Check if we have a cached per-chatbot threshold
    if (this.config.perChatbot.has(projectId)) {
      return this.config.perChatbot.get(projectId)!;
    }

    // Try to load from database
    try {
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: projectId },
        select: { config: true },
      });

      if (chatbot && chatbot.config) {
        const config = chatbot.config as any;
        if (
          config.relevanceThreshold !== undefined &&
          config.relevanceThreshold !== null
        ) {
          const threshold = parseFloat(config.relevanceThreshold);
          if (this.validateThreshold(threshold)) {
            // Cache the threshold
            this.config.perChatbot.set(projectId, threshold);
            return threshold;
          }
        }
      }
    } catch (error) {
      // If database lookup fails, fall back to global threshold
      console.warn(
        `Failed to load per-chatbot threshold for ${projectId}, using global threshold`,
      );
    }

    // Return global threshold as fallback
    return this.config.global;
  }

  /**
   * Validates that a threshold value is within valid bounds
   * Requirement 4.2: Validate threshold is between 0.0 and 1.0
   *
   * @param threshold - The threshold value to validate
   * @returns True if threshold is valid (0.0 to 1.0 inclusive)
   */
  validateThreshold(threshold: number): boolean {
    return (
      !isNaN(threshold) &&
      isFinite(threshold) &&
      threshold >= 0.0 &&
      threshold <= 1.0
    );
  }

  /**
   * Checks if a similarity score meets the relevance threshold
   * Includes soft threshold margin for near-miss warnings
   *
   * @param score - The similarity score to check
   * @param projectId - The project/chatbot identifier
   * @returns Promise that resolves to relevance check result
   */
  async checkRelevance(
    score: number,
    projectId: string,
  ): Promise<RelevanceCheckResult> {
    const threshold = await this.getThresholdForProject(projectId);
    const margin = score - threshold;
    const passed = score >= threshold;

    // Check if score is within soft threshold margin
    // This means it's close to passing but didn't quite make it
    const shouldWarn =
      !passed &&
      Math.abs(margin) <= this.config.softThresholdMargin &&
      margin < 0;

    // Generate recommendation based on the result
    let recommendation: string | null = null;
    if (!passed) {
      if (shouldWarn) {
        recommendation =
          "The answer is close to the threshold. Consider lowering the threshold or rephrasing your question.";
      } else if (margin < -0.2) {
        recommendation =
          "The question seems unrelated to your documents. Try asking about topics covered in your uploaded content.";
      } else {
        recommendation =
          "Try rephrasing your question or asking about topics covered in your documents.";
      }
    }

    return {
      passed,
      score,
      threshold,
      margin,
      shouldWarn,
      recommendation,
    };
  }

  /**
   * Updates the global threshold
   * Validates the new threshold before applying
   *
   * @param threshold - The new global threshold value
   * @throws Error if threshold is invalid
   */
  updateGlobalThreshold(threshold: number): void {
    if (!this.validateThreshold(threshold)) {
      throw new Error(
        `Invalid threshold value: ${threshold}. Must be between 0.0 and 1.0`,
      );
    }
    this.config.global = threshold;
  }

  /**
   * Updates the threshold for a specific project/chatbot
   * Validates the new threshold before applying
   *
   * @param projectId - The project/chatbot identifier
   * @param threshold - The new threshold value for this project
   * @throws Error if threshold is invalid
   */
  updateProjectThreshold(projectId: string, threshold: number): void {
    if (!this.validateThreshold(threshold)) {
      throw new Error(
        `Invalid threshold value: ${threshold}. Must be between 0.0 and 1.0`,
      );
    }
    this.config.perChatbot.set(projectId, threshold);
  }

  /**
   * Gets the current global threshold
   *
   * @returns The global threshold value
   */
  getGlobalThreshold(): number {
    return this.config.global;
  }

  /**
   * Gets the soft threshold margin
   *
   * @returns The soft threshold margin value
   */
  getSoftThresholdMargin(): number {
    return this.config.softThresholdMargin;
  }

  /**
   * Clears the per-chatbot threshold cache
   * Useful for testing or when configuration changes
   */
  clearCache(): void {
    this.config.perChatbot.clear();
  }
}
