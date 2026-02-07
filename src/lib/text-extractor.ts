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
        `Failed to extract text from TXT: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Extract text from URL using Cheerio
   * Requirements: 3.4
   *
   * @param url - URL to extract text from
   * @returns Extracted text content
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

      // Remove script and style elements
      $("script, style").remove();

      // Extract text content
      const text = $("body").text();

      // Clean up whitespace
      return text.replace(/\s+/g, " ").trim();
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
