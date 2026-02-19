import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getConfig } from "./config";

export interface ChunkMetadata {
  documentId: string;
  filename: string;
  chunkIndex?: number;
  [key: string]: any;
}

export interface Chunk {
  text: string;
  metadata: ChunkMetadata;
}

export class TextChunker {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    const config = getConfig();
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.processing.chunkSize,
      chunkOverlap: config.processing.chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  private preprocessText(text: string): string {
    // Normalize excessive whitespace but preserve paragraph breaks
    // IMPORTANT: Do NOT replace characters like | or 0 — this corrupts tables, numbers, and code
    return text
      .replace(/[ \t]+/g, " ")       // collapse horizontal whitespace
      .replace(/\n{3,}/g, "\n\n")    // collapse 3+ newlines to 2
      .trim();
  }

  private extractSections(text: string): { header: string; start: number; level: number }[] {
    const lines = text.split("\n");
    const sections: { header: string; start: number; level: number }[] = [];
    let offset = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed && trimmed.length > 2 && trimmed.length < 120) {
        // Markdown headings: # Heading, ## Heading, etc.
        const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
        if (mdMatch) {
          sections.push({ header: mdMatch[2].trim(), start: offset, level: mdMatch[1].length });
          offset += line.length + 1;
          continue;
        }

        // Numbered headings: 1., 1.1., 1.1.1., etc. followed by text
        const numMatch = trimmed.match(/^(\d+(?:\.\d+)*\.?)\s+(.{3,100})$/);
        if (numMatch) {
          sections.push({ header: numMatch[2].trim(), start: offset, level: numMatch[1].split('.').filter(Boolean).length });
          offset += line.length + 1;
          continue;
        }

        // ALL-CAPS headers: require >= 60% letter characters to avoid false positives on codes/IDs
        if (
          trimmed.length > 3 &&
          trimmed.length < 100 &&
          trimmed === trimmed.toUpperCase() &&
          (trimmed.match(/[A-Z]/g)?.length ?? 0) / trimmed.length > 0.6
        ) {
          sections.push({ header: trimmed, start: offset, level: 1 });
          offset += line.length + 1;
          continue;
        }

        // Tagged headings from URL extraction: [H1] Title, [H2] Subtitle, etc.
        const tagMatch = trimmed.match(/^\[H(\d)\]\s+(.+)/);
        if (tagMatch) {
          sections.push({ header: tagMatch[2].trim(), start: offset, level: parseInt(tagMatch[1], 10) });
          offset += line.length + 1;
          continue;
        }
      }

      offset += line.length + 1;
    }

    return sections;
  }

  private findSectionForChunk(
    chunkText: string,
    fullText: string,
    sections: { header: string; start: number; level: number }[],
  ): string | undefined {
    if (!sections.length) {
      return undefined;
    }

    const index = fullText.indexOf(chunkText);
    if (index === -1) {
      return undefined;
    }

    let chosen: { header: string; start: number; level: number } | undefined;
    for (const section of sections) {
      if (section.start <= index) {
        if (!chosen || section.start > chosen.start) {
          chosen = section;
        }
      }
    }

    return chosen?.header;
  }

  async chunkText(
    text: string,
    metadataOrFilename: ChunkMetadata | string,
    chunkSizeOverride?: number,
    chunkOverlapOverride?: number,
  ): Promise<Chunk[]> {
    const config = getConfig();
    const chunkSize = chunkSizeOverride ?? config.processing.chunkSize;
    const chunkOverlap = chunkOverlapOverride ?? config.processing.chunkOverlap;

    const baseMetadata: ChunkMetadata =
      typeof metadataOrFilename === "string"
        ? {
          documentId: "",
          filename: metadataOrFilename,
        }
        : metadataOrFilename;

    const cleanText = this.preprocessText(text);
    const sections = this.extractSections(cleanText);

    const splitter =
      chunkSize === config.processing.chunkSize &&
        chunkOverlap === config.processing.chunkOverlap
        ? this.splitter
        : new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
          separators: ["\n\n", "\n", ". ", " ", ""],
        });

    const textChunks = await splitter.splitText(cleanText);
    const totalChunks = textChunks.length;

    const chunks: Chunk[] = textChunks.map(
      (chunkText: string, index: number) => {
        const section = this.findSectionForChunk(
          chunkText,
          cleanText,
          sections,
        );
        const previousContext =
          index > 0 ? textChunks[index - 1].slice(-100) : undefined;

        const charCount = chunkText.length;
        const wordCount = chunkText.split(/\s+/).filter(Boolean).length;

        return {
          text: chunkText,
          metadata: {
            ...baseMetadata,
            chunkIndex: index,
            totalChunks,
            section,
            charCount,
            wordCount,
            previousContext,
          },
        };
      },
    );

    return chunks;
  }
}
