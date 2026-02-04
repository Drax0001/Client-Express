/**
 * PDF Extractor Client
 * 
 * Client for communicating with the Python FastAPI PDF extraction service.
 * Handles HTTP requests, authentication, timeouts, and error handling.
 */

import { getConfig } from "./config";
import { ValidationError, ServiceUnavailableError } from "./errors";

/**
 * Response from the PDF extractor service
 */
interface PdfExtractionResponse {
    text: string;
    meta: {
        method: string;
        pages: number;
    };
}

/**
 * Client for the Python PDF extractor service
 */
export class PdfExtractorClient {
    private config = getConfig();

    /**
     * Checks if the PDF extractor service is healthy
     * 
     * @returns Promise<boolean> - true if service is available
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.pdfExtractor.url}/health`, {
                method: "GET",
                signal: AbortSignal.timeout(5000), // 5 second timeout for health check
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.status === "ok";
        } catch (error) {
            console.warn("PDF extractor health check failed:", error);
            return false;
        }
    }

    /**
     * Extracts text from a PDF file synchronously
     * 
     * @param buffer - PDF file buffer
     * @returns Promise<string> - Extracted text content
     * @throws ValidationError if extraction fails or PDF is invalid
     * @throws ServiceUnavailableError if service is unavailable or times out
     */
    async extractPdfSync(buffer: Buffer): Promise<string> {
        try {
            // Create FormData with the PDF file
            const formData = new FormData();
            // Convert Buffer to Uint8Array for Blob compatibility
            const uint8Array = new Uint8Array(buffer);
            const blob = new Blob([uint8Array], { type: "application/pdf" });
            formData.append("file", blob, "document.pdf");

            // Prepare headers
            const headers: Record<string, string> = {};
            if (this.config.pdfExtractor.apiKey) {
                headers["x-service-key"] = this.config.pdfExtractor.apiKey;
            }

            // Make request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                this.config.pdfExtractor.timeoutMs
            );

            try {
                const response = await fetch(
                    `${this.config.pdfExtractor.url}/extract/pdf`,
                    {
                        method: "POST",
                        headers,
                        body: formData,
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);

                // Handle HTTP errors
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new ValidationError(
                            "PDF extractor service authentication failed. Check PDF_EXTRACTOR_API_KEY configuration."
                        );
                    }

                    if (response.status === 400) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new ValidationError(
                            `Invalid PDF file: ${errorData.detail || "Unknown error"}`
                        );
                    }

                    throw new ServiceUnavailableError(
                        `PDF extractor service returned error: ${response.status} ${response.statusText}`
                    );
                }

                // Parse response
                const data: PdfExtractionResponse = await response.json();

                if (!data.text) {
                    throw new ValidationError(
                        "PDF extractor service returned empty text. The PDF may be empty or contain only images."
                    );
                }

                console.log(
                    `PDF extracted successfully using ${data.meta.method} (${data.meta.pages} pages)`
                );

                return data.text;
            } catch (error) {
                clearTimeout(timeoutId);

                // Handle abort/timeout
                if (error instanceof Error && error.name === "AbortError") {
                    throw new ServiceUnavailableError(
                        `PDF extraction timed out after ${this.config.pdfExtractor.timeoutMs}ms. ` +
                        "The PDF may be too large or complex. Try reducing the file size or increasing PDF_EXTRACTOR_TIMEOUT_MS."
                    );
                }

                throw error;
            }
        } catch (error) {
            // Re-throw known errors
            if (
                error instanceof ValidationError ||
                error instanceof ServiceUnavailableError
            ) {
                throw error;
            }

            // Handle network errors
            if (error instanceof TypeError && error.message.includes("fetch")) {
                throw new ServiceUnavailableError(
                    `Cannot connect to PDF extractor service at ${this.config.pdfExtractor.url}. ` +
                    "Ensure the Python service is running. See pdf-extractor/README.md for setup instructions."
                );
            }

            // Generic error
            throw new ValidationError(
                `PDF extraction failed: ${error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Extracts text from a PDF file asynchronously (future enhancement)
     * 
     * This method would use the /jobs/pdf endpoint for long-running extractions
     * with webhook callbacks. Not implemented yet.
     * 
     * @param buffer - PDF file buffer
     * @returns Promise<string> - Job ID for tracking
     */
    async extractPdfAsync(buffer: Buffer): Promise<string> {
        throw new Error(
            "Async PDF extraction not yet implemented. Use extractPdfSync() instead."
        );
    }
}
