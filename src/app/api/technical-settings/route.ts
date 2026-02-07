import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", details: "Authentication required" },
      { status: 401 },
    );
  }

  const setting = await prisma.technicalSetting.findUnique({
    where: { userId: session.user.id },
  });

  const config = getConfig();
  const defaults = {
    relevanceThreshold: config.processing.relevanceThreshold,
    chunkSize: config.processing.chunkSize,
    chunkOverlap: config.processing.chunkOverlap,
    modelName: config.llm.modelName,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
  };

  return NextResponse.json(setting ?? defaults);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", details: "Authentication required" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));

  const relevanceThreshold =
    typeof body?.relevanceThreshold === "number"
      ? body.relevanceThreshold
      : undefined;
  const chunkSize =
    typeof body?.chunkSize === "number" ? body.chunkSize : undefined;
  const chunkOverlap =
    typeof body?.chunkOverlap === "number" ? body.chunkOverlap : undefined;
  const modelName =
    typeof body?.modelName === "string" ? body.modelName.trim() : undefined;
  const temperature =
    typeof body?.temperature === "number" ? body.temperature : undefined;
  const maxTokens =
    typeof body?.maxTokens === "number" ? body.maxTokens : undefined;

  if (
    relevanceThreshold !== undefined &&
    (relevanceThreshold < 0 || relevanceThreshold > 1)
  ) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: "relevanceThreshold must be between 0 and 1",
      },
      { status: 400 },
    );
  }

  if (chunkSize !== undefined && (chunkSize < 500 || chunkSize > 2000)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: "chunkSize must be between 500 and 2000",
      },
      { status: 400 },
    );
  }

  if (
    chunkOverlap !== undefined &&
    (chunkOverlap < 0 || (chunkSize && chunkOverlap >= chunkSize))
  ) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: "chunkOverlap must be between 0 and chunkSize - 1",
      },
      { status: 400 },
    );
  }

  if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: "temperature must be between 0 and 1",
      },
      { status: 400 },
    );
  }

  if (maxTokens !== undefined && (maxTokens < 100 || maxTokens > 4096)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: "maxTokens must be between 100 and 4096",
      },
      { status: 400 },
    );
  }

  const setting = await prisma.technicalSetting.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      relevanceThreshold,
      chunkSize,
      chunkOverlap,
      modelName,
      temperature,
      maxTokens,
    },
    update: {
      relevanceThreshold,
      chunkSize,
      chunkOverlap,
      modelName,
      temperature,
      maxTokens,
    },
  });

  return NextResponse.json(setting);
}
