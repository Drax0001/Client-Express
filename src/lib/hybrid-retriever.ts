import { SearchResult, VectorStore } from "./vector-store";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export class HybridRetriever {
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  private buildBm25Index(
    documents: string[],
  ): { idf: Map<string, number>; avgDocLen: number; docTokens: string[][] } {
    const docCount = documents.length || 1;
    const docTokens: string[][] = [];
    const docFreq = new Map<string, number>();
    let totalLen = 0;

    for (const doc of documents) {
      const tokens = tokenize(doc);
      docTokens.push(tokens);
      totalLen += tokens.length;
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    const idf = new Map<string, number>();
    for (const [term, df] of docFreq.entries()) {
      const value = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
      idf.set(term, value);
    }

    const avgDocLen = docTokens.length ? totalLen / docTokens.length : 0;

    return { idf, avgDocLen, docTokens };
  }

  private bm25Scores(
    query: string,
    documents: string[],
  ): number[] {
    if (!documents.length) {
      return [];
    }

    const { idf, avgDocLen, docTokens } = this.buildBm25Index(documents);
    const k1 = 1.5;
    const b = 0.75;
    const queryTokens = tokenize(query);

    return docTokens.map((tokens) => {
      if (!tokens.length || avgDocLen === 0) {
        return 0;
      }

      const termFreq = new Map<string, number>();
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }

      const docLen = tokens.length;
      let score = 0;

      for (const q of queryTokens) {
        const f = termFreq.get(q) || 0;
        if (!f) continue;
        const termIdf = idf.get(q);
        if (!termIdf) continue;

        const denom = f + k1 * (1 - b + (b * docLen) / avgDocLen);
        score += termIdf * ((f * (k1 + 1)) / denom);
      }

      return score;
    });
  }

  async hybridSearch(
    projectId: string,
    queryEmbedding: number[],
    queryText: string,
    topK: number = 10,
    alpha: number = 0.5,
  ): Promise<SearchResult[]> {
    const vectorResults = await this.vectorStore.similaritySearch(
      projectId,
      queryEmbedding,
      topK * 2,
    );

    if (!vectorResults.length) {
      return [];
    }

    const documents = vectorResults.map((r) => r.text || "");
    const bm25 = this.bm25Scores(queryText, documents);

    const maxVector = Math.max(...vectorResults.map((r) => r.score || 0), 0);
    const maxBm25 = Math.max(...bm25, 0);

    return vectorResults
      .map((result, index) => {
        const vScore = maxVector > 0 ? result.score / maxVector : 0;
        const bScore = maxBm25 > 0 ? bm25[index] / maxBm25 : 0;
        const combined = alpha * vScore + (1 - alpha) * bScore;

        return {
          ...result,
          score: combined,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

