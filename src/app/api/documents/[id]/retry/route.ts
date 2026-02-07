/**
 * POST /api/documents/[id]/retry - Retry processing a document
 */

import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/services/document.service";
import { errorHandler } from "@/lib/error-handler";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const documentService = new DocumentService(session?.user?.id);
    const { id } = await params;
    // In this simple implementation we don't pass file buffer (server should already have it if needed)
    await documentService.retryDocument(id);
    return NextResponse.json({ message: "Retry started" }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
