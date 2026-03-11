/**
 * Model Registry
 *
 * Predefined Gemini models available for bot configuration.
 * All models are currently on the FREE tier.
 */

export interface ModelDefinition {
    id: string;
    name: string;
    description: string;
    tier: "FREE" | "PRO" | "BUSINESS";
    maxTokens: number;
    contextWindow: string;
    /** Released date label */
    released: string;
    /** Is this a preview model? */
    preview: boolean;
}

export const MODEL_REGISTRY: ModelDefinition[] = [
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        description: "Fast and balanced — great for most tasks",
        tier: "FREE",
        maxTokens: 8192,
        contextWindow: "1M",
        released: "2025",
        preview: false,
    },
    {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description: "Most capable 2.5 model — complex reasoning",
        tier: "FREE",
        maxTokens: 8192,
        contextWindow: "1M",
        released: "2025",
        preview: false,
    },
    {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        description: "Latest generation — fast and capable",
        tier: "FREE",
        maxTokens: 65536,
        contextWindow: "1M",
        released: "Jan 2025",
        preview: true,
    },
    {
        id: "gemini-3.1-flash-lite-preview",
        name: "Gemini 3.1 Flash Lite",
        description: "Ultra-fast — best for simple Q&A",
        tier: "FREE",
        maxTokens: 65536,
        contextWindow: "1M",
        released: "Jan 2025",
        preview: true,
    },
    {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        description: "Most powerful — advanced reasoning and analysis",
        tier: "FREE",
        maxTokens: 65536,
        contextWindow: "1M",
        released: "Jan 2025",
        preview: true,
    },
];

export const DEFAULT_MODEL_ID = "gemini-2.5-flash";

/**
 * Get a model definition by its ID.
 * Falls back to the default model if not found.
 */
export function getModelById(modelId: string): ModelDefinition {
    return (
        MODEL_REGISTRY.find((m) => m.id === modelId) ??
        MODEL_REGISTRY.find((m) => m.id === DEFAULT_MODEL_ID)!
    );
}

/**
 * Get models available for a given plan tier.
 */
export function getModelsForTier(tier: "FREE" | "PRO" | "BUSINESS"): ModelDefinition[] {
    const tierRank = { FREE: 0, PRO: 1, BUSINESS: 2 };
    const userRank = tierRank[tier];
    return MODEL_REGISTRY.filter((m) => tierRank[m.tier] <= userRank);
}
