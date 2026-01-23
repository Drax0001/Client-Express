/**
 * GET /api/projects - List all projects
 * POST /api/projects - Create a new project
 * Requirements: 13.1, 13.6
 */

import { NextRequest, NextResponse } from "next/server";
import { ProjectService } from "@/services/project.service";
import { CreateProjectSchema } from "@/lib/schemas";
import { errorHandler } from "@/lib/error-handler";

const projectService = new ProjectService();

/**
 * GET /api/projects
 * Retrieves all projects with document counts
 */
export async function GET() {
  try {
    console.log("API: GET /api/projects - Starting request");
    const projects = await projectService.getAllProjects();
    console.log("API: GET /api/projects - Success, returning", projects.length, "projects");
    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    console.error("API: GET /api/projects - Error:", error);
    return errorHandler(error);
  }
}

/**
 * POST /api/projects
 * Creates a new project
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = CreateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // Create project using service
    const project = await projectService.createProject(name);

    // Return success response
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
