/**
 * DELETE /api/documents/[id] - Delete a document
 */

import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/services/document.service";
import { errorHandler } from "@/lib/error-handler";

const documentService = new DocumentService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const doc = await documentService.getDocument(id);
    return NextResponse.json(doc, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await documentService.deleteDocument(id);
    return NextResponse.json({ message: "Document deleted" }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
