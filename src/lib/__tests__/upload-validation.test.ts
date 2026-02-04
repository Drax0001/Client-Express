/**
 * Upload Validation Tests
 * Tests for file and URL validation utilities
 */

import {
  validateFile,
  validateFiles,
  validateUrl,
  validateUrls,
  validateFileSize,
  validateFileType,
  createUploadSessionId,
  formatFileSize,
  getFileExtension,
  isSupportedFileType,
  createUploadSession,
  getUploadSession,
  addValidatedFiles,
  addValidatedUrls,
  cleanupUploadSession
} from "../upload-validation";

import { ValidatedFile, ValidatedUrl } from "../upload-session";

// Mock File for testing
function createMockFile(name: string, size: number, type: string): File {
  return {
    name,
    size,
    type,
    lastModified: Date.now(),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
    slice: () => new Blob(),
    stream: () => new ReadableStream(),
    text: () => Promise.resolve(""),
  } as File;
}

describe("Upload Validation Utilities", () => {
  describe("validateFileSize", () => {
    it("should accept PDF files under 10MB", () => {
      const result = validateFileSize(5 * 1024 * 1024, "pdf"); // 5MB
      expect(result.isValid).toBe(true);
    });

    it("should reject PDF files over 10MB", () => {
      const result = validateFileSize(15 * 1024 * 1024, "pdf"); // 15MB
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("exceeds 10MB limit");
    });

    it("should accept TXT files under 5MB", () => {
      const result = validateFileSize(2 * 1024 * 1024, "txt"); // 2MB
      expect(result.isValid).toBe(true);
    });

    it("should reject unsupported file types", () => {
      const result = validateFileSize(1024, "exe");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unsupported file type");
    });
  });

  describe("validateFileType", () => {
    it("should accept PDF files", () => {
      const result = validateFileType("document.pdf", "application/pdf");
      expect(result.isValid).toBe(true);
      expect(result.detectedType).toBe("pdf");
    });

    it("should accept DOCX files", () => {
      const result = validateFileType("document.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(result.isValid).toBe(true);
      expect(result.detectedType).toBe("docx");
    });

    it("should accept TXT files", () => {
      const result = validateFileType("document.txt", "text/plain");
      expect(result.isValid).toBe(true);
      expect(result.detectedType).toBe("txt");
    });

    it("should reject unsupported file types", () => {
      const result = validateFileType("document.exe", "application/octet-stream");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unsupported file type");
    });

    it("should reject mismatched MIME types", () => {
      const result = validateFileType("document.pdf", "text/plain");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("MIME type");
    });
  });

  describe("validateFile", () => {
    it("should validate a valid PDF file", () => {
      const file = createMockFile("test.pdf", 1024 * 1024, "application/pdf"); // 1MB
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.name).toBe("test.pdf");
      expect(result.metadata?.detectedType).toBe("pdf");
    });

    it("should reject oversized files", () => {
      const file = createMockFile("large.pdf", 20 * 1024 * 1024, "application/pdf"); // 20MB
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File size exceeds 10MB limit");
    });

    it("should reject files without extensions", () => {
      const file = createMockFile("test", 1024, "application/pdf");
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File must have an extension");
    });

    it("should reject empty files", () => {
      const file = createMockFile("empty.pdf", 0, "application/pdf");
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File appears to be empty");
    });
  });

  describe("validateFiles", () => {
    it("should validate multiple valid files", () => {
      const files = [
        createMockFile("test1.pdf", 1024 * 1024, "application/pdf"),
        createMockFile("test2.docx", 1024 * 1024, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      ];

      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle mixed valid and invalid files", () => {
      const files = [
        createMockFile("valid.pdf", 1024 * 1024, "application/pdf"),
        createMockFile("invalid.exe", 1024 * 1024, "application/octet-stream"),
        createMockFile("oversized.pdf", 20 * 1024 * 1024, "application/pdf"),
      ];

      const result = validateFiles(files);

      expect(result.validFiles).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("invalid.exe");
      expect(result.errors[1]).toContain("oversized.pdf");
    });
  });

  describe("validateUrl", () => {
    it("should validate a valid HTTP URL", async () => {
      // Mock fetch for testing
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            get: (key: string) => {
              if (key === 'content-type') return 'text/html';
              if (key === 'content-length') return '1024';
              return null;
            }
          }
        } as Response)
      );

      const result = await validateUrl("https://example.com");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.url).toBe("https://example.com");
      expect(result.metadata?.contentType).toBe("text/html");
    });

    it("should reject invalid URLs", async () => {
      const result = await validateUrl("not-a-url");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid URL format");
    });

    it("should reject localhost URLs", async () => {
      const result = await validateUrl("http://localhost:3000");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Local/private URLs are not allowed");
    });

    it("should handle HTTP errors", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: { get: () => null }
        } as Response)
      );

      const result = await validateUrl("https://example.com/notfound");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("URL not found (404)");
    });
  });

  describe("Utility Functions", () => {
    describe("createUploadSessionId", () => {
      it("should generate unique session IDs", () => {
        const id1 = createUploadSessionId();
        const id2 = createUploadSessionId();

        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^upload_\d+_[a-z0-9]+$/);
      });
    });

    describe("formatFileSize", () => {
      it("should format bytes correctly", () => {
        expect(formatFileSize(0)).toBe("0 Bytes");
        expect(formatFileSize(1024)).toBe("1.00 KB");
        expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
        expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
      });
    });

    describe("getFileExtension", () => {
      it("should extract file extensions", () => {
        expect(getFileExtension("document.pdf")).toBe("pdf");
        expect(getFileExtension("file.txt")).toBe("txt");
        expect(getFileExtension("noextension")).toBe("");
        expect(getFileExtension("multiple.dots.file.docx")).toBe("docx");
      });
    });

    describe("isSupportedFileType", () => {
      it("should identify supported file types", () => {
        expect(isSupportedFileType("pdf")).toBe(true);
        expect(isSupportedFileType("docx")).toBe(true);
        expect(isSupportedFileType("txt")).toBe(true);
        expect(isSupportedFileType("exe")).toBe(false);
        expect(isSupportedFileType("")).toBe(false);
      });
    });
  });

  describe("Upload Session Management", () => {
    beforeEach(() => {
      // Clear sessions before each test
      // Note: In a real implementation, you'd want a way to clear all sessions
    });

    describe("createUploadSession", () => {
      it("should create a new upload session", () => {
        const session = createUploadSession("test-user");

        expect(session.id).toMatch(/^upload_\d+_[a-z0-9]+$/);
        expect(session.userId).toBe("test-user");
        expect(session.status).toBe("active");
        expect(session.files).toEqual([]);
        expect(session.urls).toEqual([]);
        expect(session.totalSize).toBe(0);
        expect(session.errorCount).toBe(0);
      });
    });

    describe("getUploadSession", () => {
      it("should retrieve an existing session", () => {
        const session = createUploadSession();
        const retrieved = getUploadSession(session.id);

        expect(retrieved).toEqual(session);
      });

      it("should return null for non-existent sessions", () => {
        const retrieved = getUploadSession("non-existent");
        expect(retrieved).toBeNull();
      });
    });

    describe("addValidatedFiles", () => {
      it("should add files to a session", () => {
        const session = createUploadSession();
        const validatedFiles: ValidatedFile[] = [
          {
            id: "file1",
            file: createMockFile("test.pdf", 1024, "application/pdf"),
            status: "ready",
            validationErrors: [],
            metadata: {
              name: "test.pdf",
              size: 1024,
              type: "application/pdf",
              lastModified: new Date(),
              detectedType: "pdf"
            }
          }
        ];

        const updated = addValidatedFiles(session.id, validatedFiles);
        expect(updated.files).toHaveLength(1);
        expect(updated.totalSize).toBe(1024);
      });
    });

    describe("cleanupUploadSession", () => {
      it("should remove a session", () => {
        const session = createUploadSession();
        cleanupUploadSession(session.id);

        const retrieved = getUploadSession(session.id);
        expect(retrieved).toBeNull();
      });
    });
  });
});