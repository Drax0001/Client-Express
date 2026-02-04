/**
 * UploadService Tests
 * Tests for the UploadService functionality
 */

import { UploadService } from "../upload.service";
import { createUploadSession, cleanupUploadSession } from "../../lib/upload-validation";

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

describe("UploadService", () => {
  let uploadService: UploadService;

  beforeEach(() => {
    uploadService = new UploadService({
      maxFilesPerSession: 10,
      maxUrlsPerSession: 5,
    });
  });

  afterEach(() => {
    // Clean up any created sessions
    // Note: In a real implementation, we'd need a way to clean up all sessions
  });

  describe("validateAndStoreFiles", () => {
    it("should validate and store valid files", async () => {
      const files = [
        createMockFile("test.pdf", 1024 * 1024, "application/pdf"), // 1MB PDF
        createMockFile("test.txt", 1024, "text/plain"), // 1KB TXT
      ];

      const session = await uploadService.validateAndStoreFiles(files);

      expect(session.files).toHaveLength(2);
      expect(session.totalSize).toBeGreaterThan(0);
      expect(session.errorCount).toBe(0);
    });

    it("should reject oversized files", async () => {
      const files = [
        createMockFile("large.pdf", 20 * 1024 * 1024, "application/pdf"), // 20MB PDF
      ];

      await expect(
        uploadService.validateAndStoreFiles(files)
      ).rejects.toThrow("File size exceeds 10MB limit");
    });

    it("should reject too many files", async () => {
      const files = Array.from({ length: 15 }, (_, i) =>
        createMockFile(`test${i}.pdf`, 1024, "application/pdf")
      );

      await expect(
        uploadService.validateAndStoreFiles(files)
      ).rejects.toThrow("Too many files");
    });

    it("should use existing session when sessionId provided", async () => {
      // First create a session
      const initialSession = uploadService.createUploadSession();
      const files = [createMockFile("test.pdf", 1024, "application/pdf")];

      // Add files to existing session
      const updatedSession = await uploadService.validateAndStoreFiles(
        files,
        initialSession.id
      );

      expect(updatedSession.id).toBe(initialSession.id);
      expect(updatedSession.files).toHaveLength(1);
    });
  });

  describe("validateAndStoreUrls", () => {
    it("should validate and store valid URLs", async () => {
      // Mock fetch for URL validation
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

      const urls = ["https://example.com"];

      const session = await uploadService.validateAndStoreUrls(urls);

      expect(session.urls).toHaveLength(1);
      expect(session.urls[0].url).toBe("https://example.com");
      expect(session.errorCount).toBe(0);
    });

    it("should reject invalid URLs", async () => {
      const urls = ["not-a-valid-url"];

      await expect(
        uploadService.validateAndStoreUrls(urls)
      ).rejects.toThrow("No valid URLs provided");
    });

    it("should reject localhost URLs", async () => {
      const urls = ["http://localhost:3000"];

      await expect(
        uploadService.validateAndStoreUrls(urls)
      ).rejects.toThrow("Local/private URLs are not allowed");
    });
  });

  describe("createUploadSession", () => {
    it("should create a new upload session", () => {
      const session = uploadService.createUploadSession("test-user");

      expect(session.id).toMatch(/^upload_\d+_[a-z0-9]+$/);
      expect(session.userId).toBe("test-user");
      expect(session.status).toBe("active");
      expect(session.files).toEqual([]);
      expect(session.urls).toEqual([]);
    });
  });

  describe("getUploadSession", () => {
    it("should retrieve an existing session", () => {
      const created = uploadService.createUploadSession();
      const retrieved = uploadService.getUploadSession(created.id);

      expect(retrieved).toEqual(created);
    });

    it("should return null for non-existent session", () => {
      const retrieved = uploadService.getUploadSession("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("validateSessionForTraining", () => {
    it("should validate a ready session", async () => {
      const files = [createMockFile("test.pdf", 1024, "application/pdf")];
      const session = await uploadService.validateAndStoreFiles(files);

      const validation = uploadService.validateSessionForTraining(session.id);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.totalFiles).toBe(1);
    });

    it("should reject empty session", () => {
      const session = uploadService.createUploadSession();

      const validation = uploadService.validateSessionForTraining(session.id);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain("Session contains no files or URLs");
    });

    it("should reject non-existent session", () => {
      const validation = uploadService.validateSessionForTraining("non-existent");

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain("Upload session not found or expired");
    });
  });

  describe("cleanupUploadSession", () => {
    it("should clean up a session", () => {
      const session = uploadService.createUploadSession();
      uploadService.cleanupUploadSession(session.id);

      const retrieved = uploadService.getUploadSession(session.id);
      expect(retrieved).toBeNull();
    });
  });
});