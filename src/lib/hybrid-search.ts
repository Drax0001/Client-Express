/**
 * Hybrid Search Module
 *
 * Combines vector (semantic) search with keyword matching using
 * Reciprocal Rank Fusion (RRF) to merge the results.
 *
 * This solves the problem where pure vector search misses exact keyword matches
 * (e.g., "ISO 9001", specific product codes, or technical terms).
 */

import { VectorStore } from "./vector-store";

export interface HybridSearchResult {
    id: string;
    score: number;
    text: string;
    metadata: Record<string, any>;
}

export class HybridSearch {
    private vectorStore: VectorStore;

    constructor(vectorStore?: VectorStore) {
        this.vectorStore = vectorStore || new VectorStore();
    }

    /**
     * Perform hybrid search combining vector similarity and keyword matching.
     *
     * 1. Vector search: find semantically similar chunks
     * 2. Keyword search: find chunks containing key terms from the query
     * 3. RRF merge: combine both result sets using Reciprocal Rank Fusion
     *
     * @param projectId - Project identifier for collection scoping
     * @param query - The original user query text
     * @param queryEmbedding - Pre-computed query embedding vector
     * @param topK - Number of results to return (default 15)
     * @returns Merged search results sorted by combined RRF score
     */
    async search(
        projectId: string,
        query: string,
        queryEmbedding: number[],
        topK: number = 15,
    ): Promise<HybridSearchResult[]> {
        // Run vector and keyword searches in parallel
        const [vectorResults, keywordResults] = await Promise.all([
            this.vectorSearchWithFallback(projectId, queryEmbedding, topK),
            this.keywordSearch(projectId, query, topK),
        ]);

        // If keyword search returned nothing, just return vector results
        if (keywordResults.length === 0) {
            return vectorResults.slice(0, topK);
        }

        // Merge using Reciprocal Rank Fusion
        const merged = this.reciprocalRankFusion(vectorResults, keywordResults);
        return merged.slice(0, topK);
    }

    /**
     * Standard vector similarity search with error fallback
     */
    private async vectorSearchWithFallback(
        projectId: string,
        queryEmbedding: number[],
        topK: number,
    ): Promise<HybridSearchResult[]> {
        try {
            const results = await this.vectorStore.similaritySearch(
                projectId,
                queryEmbedding,
                topK,
            );
            return results.map((r) => ({
                id: r.id,
                score: r.score,
                text: r.text,
                metadata: r.metadata || {},
            }));
        } catch (error) {
            console.error("HybridSearch: vector search failed:", error);
            return [];
        }
    }

    /**
     * Simple keyword-based search using ChromaDB where filter.
     *
     * Extracts significant keywords from the query (removes stop words)
     * and uses ChromaDB's document contains filter to find matching chunks.
     */
    private async keywordSearch(
        projectId: string,
        query: string,
        topK: number,
    ): Promise<HybridSearchResult[]> {
        try {
            // Extract meaningful keywords (non-stop words, 3+ chars)
            const keywords = this.extractKeywords(query);

            if (keywords.length === 0) {
                return [];
            }

            // Use ChromaDB's $contains filter for keyword matching
            // We search for each keyword and merge results
            const allResults: HybridSearchResult[] = [];
            const seenIds = new Set<string>();

            for (const keyword of keywords.slice(0, 3)) {
                // Limit to top 3 keywords
                try {
                    const results = await this.vectorStore.queryByKeyword(
                        projectId,
                        keyword,
                        Math.ceil(topK / 2),
                    );

                    for (const result of results) {
                        if (!seenIds.has(result.id)) {
                            seenIds.add(result.id);
                            allResults.push(result);
                        }
                    }
                } catch {
                    // Individual keyword search failures are non-critical
                    continue;
                }
            }

            return allResults;
        } catch (error) {
            console.warn("HybridSearch: keyword search failed:", error);
            return [];
        }
    }

    /**
     * Extract significant keywords from query text.
     * Removes common stop words and short words.
     */
    private extractKeywords(query: string): string[] {
        const stopWords = new Set([
            "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "can", "shall", "must", "need",
            "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
            "they", "them", "their", "this", "that", "these", "those",
            "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
            "and", "or", "but", "not", "if", "then", "else", "so", "because",
            "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "out",
            "about", "into", "over", "after", "before", "during", "between",
            "all", "each", "every", "both", "few", "more", "most", "some", "any",
            "no", "just", "also", "very", "much", "too", "than", "only",
            "tell", "know", "said", "say", "like", "get", "make", "go",
        ]);

        return query
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length >= 3 && !stopWords.has(word))
            .slice(0, 5); // Keep top 5 keywords
    }

    /**
     * Reciprocal Rank Fusion (RRF) to merge two ranked result lists.
     *
     * RRF score = sum of 1/(k + rank) across all lists where the item appears.
     * k=60 is the standard constant that smooths the impact of high rankings.
     *
     * This is preferred over simple score normalization because it works well
     * when the score distributions from different search methods are very different.
     */
    private reciprocalRankFusion(
        vectorResults: HybridSearchResult[],
        keywordResults: HybridSearchResult[],
        k: number = 60,
    ): HybridSearchResult[] {
        const scores = new Map<
            string,
            { score: number; result: HybridSearchResult }
        >();

        // Score vector results
        vectorResults.forEach((result, rank) => {
            const rrfScore = 1 / (k + rank + 1);
            scores.set(result.id, {
                score: (scores.get(result.id)?.score || 0) + rrfScore,
                result,
            });
        });

        // Score keyword results
        keywordResults.forEach((result, rank) => {
            const rrfScore = 1 / (k + rank + 1);
            const existing = scores.get(result.id);
            scores.set(result.id, {
                score: (existing?.score || 0) + rrfScore,
                result: existing?.result || result,
            });
        });

        // Sort by combined RRF score (descending)
        return Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .map(({ result, score }) => ({ ...result, score }));
    }
}
