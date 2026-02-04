/**
 * POST /api/documents/upload - Upload document or URL
 * Handles file uploads and URL submissions for document processing
 * Requirements: 13.4, 13.6
 */

import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/services/document.service";
import { UploadDocumentSchema } from "@/lib/schemas";
import { errorHandler } from "@/lib/error-handler";

const documentService = new DocumentService();

/**
 * POST /api/documents/upload
 * Handles document uploads (files or URLs)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract projectId from form data
    const projectIdEntry = formData.get("projectId");
    const urlEntry = formData.get("url");
    const fileEntry = formData.get("file");

    console.log("API: Document upload - raw FormData entries:", {
      projectIdEntry: typeof projectIdEntry + " - " + projectIdEntry,
      urlEntry: typeof urlEntry + " - " + urlEntry,
      fileEntry:
        fileEntry instanceof File
          ? `File: ${fileEntry.name}`
          : typeof fileEntry + " - " + fileEntry,
      allKeys: Array.from(formData.keys()),
    });

    // Convert to proper types
    const projectId = projectIdEntry as string;
    const url = urlEntry as string;
    const file = fileEntry instanceof File ? fileEntry : null;

    console.log("API: Document upload - processed data:", {
      projectId,
      hasUrl: !!url,
      hasFile: !!file,
      url: url ? url.substring(0, 100) + "..." : null,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });

    // Validate request with Zod schema
    const validationResult = UploadDocumentSchema.safeParse({
      body: { projectId },
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    let document;

    if (url) {
      // Handle URL upload
      document = await documentService.uploadUrl(projectId, url);
    } else if (file) {
      // Handle file upload
      // Convert File to buffer format expected by DocumentService
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileData = {
        name: file.name,
        type: file.type,
        buffer: buffer,
      };

      document = await documentService.uploadDocument(projectId, fileData);
    } else {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: "Either 'file' or 'url' must be provided",
        },
        { status: 400 },
      );
    }

    // Trigger async document processing in background (fire-and-forget)
    // Note: In production you would use a job queue (Redis, Bull, etc.)
    try {
      console.log(
        `Document uploaded successfully: ${document.id}, starting background processing`,
      );

      // Fire-and-forget processing so upload response returns quickly
      (async () => {
        try {
          if (file) {
            await documentService.processDocument(
              document.id,
              Buffer.from(await file.arrayBuffer()),
            );
          } else {
            await documentService.processDocument(document.id);
          }
        } catch (processError) {
          console.error(
            `Background processing failed for ${document.id}:`,
            processError,
          );
        }
      })();
    } catch (processError) {
      console.error(
        `Failed to start background processing for ${document.id}:`,
        processError,
      );
    }

    // Return success response
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
