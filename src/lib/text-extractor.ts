/**
 * Text extraction utilities for RAG Chatbot Backend
 * Implements text extraction from various document formats using LangChain loaders
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { ValidationError, ServiceUnavailableError } from "./errors";
import * as cheerio from "cheerio";

/**
 * TextExtractor class provides methods to extract text from various document formats
 * Uses LangChain-compatible document loaders for consistent text extraction
 */
export class TextExtractor {
  /**
   * Main method to extract text from a document
   * Dispatches to appropriate extractor based on filename (URL or file extension)
   *
   * @param filename - Document filename or URL
   * @param buffer - File buffer (required for non-URL documents)
   * @returns Extracted text content
   * @throws ValidationError if extraction fails or unsupported format
   */
  async extractText(filename: string, buffer?: Buffer): Promise<string> {
    try {
      // Check if it's a URL
      if (filename.startsWith("http://") || filename.startsWith("https://")) {
        return await this.extractFromUrl(filename);
      }

      // For files, require buffer
      if (!buffer) {
        throw new ValidationError("Buffer is required for file extraction");
      }

      // Determine file type from extension
      const lowerFilename = filename.toLowerCase();
      if (lowerFilename.endsWith(".pdf")) {
        return await this.extractFromPdf(buffer);
      } else if (lowerFilename.endsWith(".docx")) {
        return await this.extractFromDocx(buffer);
      } else if (lowerFilename.endsWith(".txt")) {
        return await this.extractFromTxt(buffer);
      } else if (lowerFilename.endsWith(".xlsx") || lowerFilename.endsWith(".xls")) {
        return await this.extractFromXlsx(buffer);
      } else if (lowerFilename.endsWith(".csv")) {
        return await this.extractFromCsv(buffer);
      } else if (lowerFilename.endsWith(".pptx")) {
        return await this.extractFromPptx(buffer);
      } else {
        throw new ValidationError(`Unsupported file format: ${filename}`);
      }
    } catch (error) {
      // Re-throw known errors
      if (error instanceof ValidationError || error instanceof ServiceUnavailableError) {
        throw error;
      }
      // Wrap unexpected errors
      throw new ValidationError(
        `Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Extract text from PDF file using Python PDF extractor service
   * Requirements: 3.1
   *
   * @param buffer - PDF file buffer
   * @returns Extracted text content
   * @throws ValidationError if extraction fails
   * @throws ServiceUnavailableError if PDF extractor service is unavailable
   */
  async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      // Use Python PDF extractor service for reliable extraction
      const { PdfExtractorClient } = await import("./pdf-extractor-client");
      const client = new PdfExtractorClient();

      return await client.extractPdfSync(buffer);
    } catch (error) {
      // Re-throw known errors from the client
      if (
        error instanceof ValidationError ||
        error instanceof ServiceUnavailableError
      ) {
        throw error;
      }

      // Handle unexpected errors
      throw new ValidationError(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract text from DOCX file
   * Requirements: 3.2
   *
   * @param buffer - DOCX file buffer
   * @returns Extracted text content
   * @throws ValidationError if extraction fails
   */
  async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      // Import mammoth dynamically to handle DOCX files
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new ValidationError(
        `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Extract text from TXT file
   * Requirements: 3.3
   *
   * @param buffer - TXT file buffer
   * @returns Extracted text content
   * @throws ValidationError if extraction fails
   */
  async extractFromTxt(buffer: Buffer): Promise<string> {
    try {
      return buffer.toString("utf-8");
    } catch (error) {
      throw new ValidationError(
        `Failed to extract text from TXT: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract text from XLSX/XLS file
   */
  async extractFromXlsx(buffer: Buffer): Promise<string> {
    try {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let text = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          text += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
        }
      }
      return text.trim();
    } catch (error) {
      throw new ValidationError(
        `Failed to extract text from Excel file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract text from CSV file
   */
  async extractFromCsv(buffer: Buffer): Promise<string> {
    try {
      return buffer.toString("utf-8");
    } catch (error) {
      throw new ValidationError(
        `Failed to extract text from CSV file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract text from PPTX file
   */
  async extractFromPptx(buffer: Buffer): Promise<string> {
    try {
      const { OfficeParser } = await import("officeparser");
      const ast = await OfficeParser.parseOffice(buffer);
      const text = ast.toText();
      return typeof text === "string" ? text : String(text);
    } catch (error) {
      throw new ValidationError(
        `Failed to extract text from PowerPoint: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract text from URL using Cheerio with structured HTML preservation
   * Preserves semantic HTML elements (headings, paragraphs, lists) as tagged blocks
   * so the chunker can detect sections and provide proper source attribution.
   * Requirements: 3.4
   *
   * @param url - URL to extract text from
   * @returns Extracted text content with semantic tags
   * @throws ValidationError if extraction fails or URL is invalid
   */
  async extractFromUrl(url: string): Promise<string> {
    try {
      // Validate URL format
      new URL(url);

      // Fetch the HTML content
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Parse HTML and extract text using Cheerio
      const $ = cheerio.load(html);

      // Remove script, style, nav, footer, and other non-content elements
      $("script, style, nav, footer, header, aside, .cookie-banner, .sidebar, [role='navigation']").remove();

      // Build structured text with semantic tag labels
      // This preserves document structure so the chunker can detect sections
      const blocks: string[] = [];

      // Extract title
      const title = $("title").text().trim();
      if (title) {
        blocks.push(`[H1] ${title}`);
      }

      // Process content-bearing elements in DOM order
      const contentSelectors = "h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre, figcaption, dt, dd";
      $(contentSelectors).each((_: number, el: any) => {
        const tagName = el.tagName?.toUpperCase() || "";
        const text = $(el).text().trim();

        if (!text || text.length < 2) return;

        // Skip if this is a nested element already captured by parent
        if ($(el).parents(contentSelectors).length > 0 && !["LI", "TD", "TH", "DT", "DD"].includes(tagName)) {
          return;
        }

        blocks.push(`[${tagName}] ${text}`);
      });

      const result = blocks.join("\n");

      // Fallback to body text if structured extraction yields nothing
      if (!result.trim()) {
        return $("body").text().replace(/\s+/g, " ").trim();
      }

      return result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("Invalid URL")) {
        throw new ValidationError(`Invalid URL format: ${url}`);
      }
      throw new ValidationError(
        `Failed to extract text from URL: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}
