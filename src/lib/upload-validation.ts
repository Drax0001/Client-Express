/**
 * Upload Validation Utilities
 * Provides validation functions for file and URL uploads in the training system
 */

import { ValidationError } from "./errors";

// Re-export session management functions
export * from "./upload-session";

// File size limits by type (in bytes)
export const FILE_SIZE_LIMITS = {
  pdf: 10 * 1024 * 1024, // 10MB
  docx: 10 * 1024 * 1024, // 10MB
  txt: 5 * 1024 * 1024, // 5MB
} as const;

// Supported file types
export const SUPPORTED_FILE_TYPES = ["pdf", "docx", "txt"] as const;
export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[number];

// Validation result interfaces
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: {
    name: string;
    size: number;
    type: string;
    detectedType?: SupportedFileType;
  };
}

export interface UrlValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: {
    url: string;
    contentType?: string;
    contentLength?: number;
    title?: string;
  };
}

/**
 * Validates file size based on file type
 */
export function validateFileSize(fileSize: number, fileType: string): { isValid: boolean; error?: string } {
  const limit = FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS];

  if (!limit) {
    return {
      isValid: false,
      error: `Unsupported file type: ${fileType}`
    };
  }

  if (fileSize > limit) {
    const limitMB = limit / (1024 * 1024);
    return {
      isValid: false,
      error: `File size exceeds ${limitMB}MB limit for ${fileType.toUpperCase()} files`
    };
  }

  return { isValid: true };
}

/**
 * Validates file type using filename extension and MIME type
 */
export function validateFileType(filename: string, mimeType: string): { isValid: boolean; detectedType?: SupportedFileType; error?: string } {
  // Extract file extension
  const extension = filename.split('.').pop()?.toLowerCase();

  if (!extension) {
    return {
      isValid: false,
      error: "File must have an extension"
    };
  }

  // Check if extension is supported
  if (!SUPPORTED_FILE_TYPES.includes(extension as SupportedFileType)) {
    return {
      isValid: false,
      error: `Unsupported file type. Supported: ${SUPPORTED_FILE_TYPES.join(', ')}`
    };
  }

  // Validate MIME type matches extension
  const expectedMimeTypes = getMimeTypesForExtension(extension);
  if (!expectedMimeTypes.includes(mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `MIME type ${mimeType} does not match file extension ${extension}`
    };
  }

  return {
    isValid: true,
    detectedType: extension as SupportedFileType
  };
}

/**
 * Gets expected MIME types for a file extension
 */
function getMimeTypesForExtension(extension: string): string[] {
  const mimeTypeMap: Record<string, string[]> = {
    pdf: ['application/pdf'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream' // Some systems report docx as octet-stream
    ],
    txt: [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/text'
    ]
  };

  return mimeTypeMap[extension] || [];
}

/**
 * Validates a file for upload
 */
export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];

  // Validate file name
  if (!file.name || file.name.trim().length === 0) {
    errors.push("File name is required");
  }

  // Validate file size
  const sizeValidation = validateFileSize(file.size, file.type.split('/')[1] || file.name.split('.').pop() || '');
  if (!sizeValidation.isValid) {
    errors.push(sizeValidation.error!);
  }

  // Validate file type
  const typeValidation = validateFileType(file.name, file.type);
  if (!typeValidation.isValid) {
    errors.push(typeValidation.error!);
  }

  // Check for file corruption (basic check)
  if (file.size === 0) {
    errors.push("File appears to be empty");
  }

  return {
    isValid: errors.length === 0,
    errors,
    metadata: errors.length === 0 ? {
      name: file.name,
      size: file.size,
      type: file.type,
      detectedType: typeValidation.detectedType
    } : undefined
  };
}

/**
 * Validates multiple files for upload
 */
export function validateFiles(files: File[]): { validFiles: File[]; errors: string[] } {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file, index) => {
    const validation = validateFile(file);

    if (validation.isValid) {
      validFiles.push(file);
    } else {
      validation.errors.forEach(error => {
        errors.push(`${file.name}: ${error}`);
      });
    }
  });

  return { validFiles, errors };
}

/**
 * Validates a URL for processing
 */
export async function validateUrl(url: string): Promise<UrlValidationResult> {
  const errors: string[] = [];

  // Basic URL format validation
  try {
    const urlObj = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push("URL must use HTTP or HTTPS protocol");
    }

    // Check for localhost/private IPs (optional security measure)
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.startsWith('192.168.') || urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.')) {
      errors.push("Local/private URLs are not allowed");
    }

  } catch {
    errors.push("Invalid URL format");
    return { isValid: false, errors };
  }

  // Attempt to fetch URL metadata
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Chatbot-Trainer/1.0)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        errors.push("URL not found (404)");
      } else if (response.status === 403) {
        errors.push("Access forbidden (403) - URL may be blocked");
      } else if (response.status >= 500) {
        errors.push("Server error - URL may be temporarily unavailable");
      } else {
        errors.push(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('text/plain') || contentType === '') {
      // These are acceptable for web scraping
    } else {
      errors.push(`Unsupported content type: ${contentType}`);
    }

    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      if (size > 50 * 1024 * 1024) { // 50MB limit for URLs
        errors.push("URL content too large (max 50MB)");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      metadata: errors.length === 0 ? {
        url,
        contentType,
        contentLength: contentLength ? parseInt(contentLength) : undefined
      } : undefined
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errors.push("URL request timed out");
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errors.push("URL not reachable");
      } else {
        errors.push(`Network error: ${error.message}`);
      }
    } else {
      errors.push("Unknown error occurred while validating URL");
    }

    return { isValid: false, errors };
  }
}

/**
 * Validates multiple URLs for processing
 */
export async function validateUrls(urls: string[]): Promise<{ validUrls: string[]; errors: string[] }> {
  const validUrls: string[] = [];
  const errors: string[] = [];

  // Process URLs in parallel with concurrency limit
  const concurrencyLimit = 5;
  for (let i = 0; i < urls.length; i += concurrencyLimit) {
    const batch = urls.slice(i, i + concurrencyLimit);
    const promises = batch.map(async (url) => {
      const validation = await validateUrl(url);
      return { url, validation };
    });

    const results = await Promise.all(promises);

    results.forEach(({ url, validation }) => {
      if (validation.isValid) {
        validUrls.push(url);
      } else {
        validation.errors.forEach(error => {
          errors.push(`${url}: ${error}`);
        });
      }
    });
  }

  return { validUrls, errors };
}

/**
 * Creates an upload session identifier
 */
export function createUploadSessionId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Checks if a file type is supported
 */
export function isSupportedFileType(fileType: string): boolean {
  return SUPPORTED_FILE_TYPES.includes(fileType as SupportedFileType);
}