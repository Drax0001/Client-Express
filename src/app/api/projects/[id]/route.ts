/**
 * GET /api/projects/[id] - Retrieve project details
 * DELETE /api/projects/[id] - Delete project and all associated data
 * Requirements: 13.2, 13.3
 */

import { NextRequest, NextResponse } from "next/server";
import { ProjectService } from "@/services/project.service";
import { GetProjectSchema, DeleteProjectSchema } from "@/lib/schemas";
import { errorHandler } from "@/lib/error-handler";
import { NotFoundError } from "@/lib/errors";
import { auth } from "../../../../lib/auth";

import { prisma } from "../../../../../lib/prisma";

const projectService = new ProjectService();

/**
 * GET /api/projects/[id]
 * Retrieves project details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 16
    const { id } = await params;

    // Validate project ID parameter
    const validationResult = GetProjectSchema.safeParse({
      params: { id },
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { id: validatedId } = validationResult.data.params;

    // Retrieve project using service
    const project = await projectService.getProject(validatedId);

    // Return success response
    return NextResponse.json(project, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project and all associated documents
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 16
    const { id } = await params;

    // Validate project ID parameter
    const validationResult = DeleteProjectSchema.safeParse({
      params: { id },
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { id: validatedId } = validationResult.data.params;

    // Delete project using service (cascade deletes documents)
    await projectService.deleteProject(validatedId);

    // Return success response
    return NextResponse.json(
      { message: "Project deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

/**
 * PATCH /api/projects/[id]
 * Updates mutable project fields: leadCaptureEnabled, leadCaptureFields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.leadCaptureEnabled === "boolean") {
      updateData.leadCaptureEnabled = body.leadCaptureEnabled;
    }
    if (Array.isArray(body.leadCaptureFields)) {
      updateData.leadCaptureFields = body.leadCaptureFields;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      select: { id: true, leadCaptureEnabled: true, leadCaptureFields: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorHandler(error);
  }
}
