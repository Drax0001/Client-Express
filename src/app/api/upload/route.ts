/**
 * POST /api/upload - Upload files and URLs for training
 * Handles multipart form data with files and URLs, validates them, and creates upload sessions
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { NextRequest, NextResponse } from "next/server";
import { UploadService } from "@/services/upload.service";
import { errorHandler } from "@/lib/error-handler";

const uploadService = new UploadService({
  maxFilesPerSession: 20,
  maxUrlsPerSession: 10,
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
});

/**
 * POST /api/upload
 * Handles file and URL uploads for training sessions
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    console.log("API: Upload - received FormData keys:", Array.from(formData.keys()));

    // Extract files and URLs from form data
    const files: File[] = [];
    const urls: string[] = [];

    // Process all form data entries
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      } else if (key.startsWith('urls[') && typeof value === 'string') {
        // Handle URL arrays (urls[0], urls[1], etc.)
        urls.push(value);
      } else if (key === 'url' && typeof value === 'string') {
        // Handle single URL
        urls.push(value);
      }
    }

    console.log(`API: Upload - processing ${files.length} files and ${urls.length} URLs`);

    // Validate that we have something to upload
    if (files.length === 0 && urls.length === 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "At least one file or URL must be provided",
        },
        { status: 400 }
      );
    }

    // Create upload session and validate files
    let session;

    try {
      // Start with files if any
      if (files.length > 0) {
        session = await uploadService.validateAndStoreFiles(files);
        console.log(`API: Upload - created session ${session.id} with ${session.files.length} files`);
      }

      // Add URLs if any
      if (urls.length > 0) {
        const sessionId = session?.id;
        session = await uploadService.validateAndStoreUrls(urls, sessionId);
        console.log(`API: Upload - added ${session.urls.length} URLs to session ${session.id}`);
      }

      if (!session) {
        throw new Error("Failed to create upload session");
      }

    } catch (validationError: any) {
      console.error("API: Upload - validation error:", validationError);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationError.message,
        },
        { status: 400 }
      );
    }

    // Return successful response
    const response = {
      uploadId: session.id,
      status: session.status,
      files: session.files.map(file => ({
        id: file.id,
        name: file.metadata.name,
        size: file.metadata.size,
        type: file.metadata.detectedType,
        status: file.status,
        errors: file.validationErrors,
      })),
      urls: session.urls.map(url => ({
        id: url.id,
        url: url.url,
        status: url.status,
        errors: url.validationErrors,
      })),
      totalSize: session.totalSize,
      errorCount: session.errorCount,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };

    console.log(`API: Upload - success, session ${session.id} ready for training`);

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error("API: Upload - unexpected error:", error);
    return errorHandler(error);
  }
}

/**
 * GET /api/upload/:sessionId - Get upload session details
 * Useful for checking session status before training
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = uploadService.getUploadSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          error: "Upload session not found",
          details: "The session may have expired or doesn't exist",
        },
        { status: 404 }
      );
    }

    const response = {
      uploadId: session.id,
      status: session.status,
      files: session.files.map(file => ({
        id: file.id,
        name: file.metadata.name,
        size: file.metadata.size,
        type: file.metadata.detectedType,
        status: file.status,
        errors: file.validationErrors,
      })),
      urls: session.urls.map(url => ({
        id: url.id,
        url: url.url,
        status: url.status,
        errors: url.validationErrors,
      })),
      totalSize: session.totalSize,
      errorCount: session.errorCount,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("API: Get upload session - error:", error);
    return errorHandler(error);
  }
}