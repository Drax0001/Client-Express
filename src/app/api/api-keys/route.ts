import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encryptValue } from "@/lib/encryption";
import { prisma } from "../../../../lib/prisma";

const allowedKinds = ["llm", "embedding"] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", details: "Authentication required" },
      { status: 401 },
    );
  }

  const keys = await prisma.userApiKey.findMany({
    where: { userId: session.user.id },
    select: { kind: true, lastFour: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", details: "Authentication required" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const kind = body?.kind;
  const value = typeof body?.value === "string" ? body.value.trim() : "";

  if (!allowedKinds.includes(kind) || !value) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: "kind must be llm or embedding and value is required",
      },
      { status: 400 },
    );
  }

  const encryptedKey = encryptValue(value);
  const lastFour = value.slice(-4);

  const apiKey = await prisma.userApiKey.upsert({
    where: { userId_kind: { userId: session.user.id, kind } },
    create: {
      userId: session.user.id,
      kind,
      encryptedKey,
      lastFour,
    },
    update: {
      encryptedKey,
      lastFour,
    },
    select: { kind: true, lastFour: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(apiKey);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", details: "Authentication required" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const kind = body?.kind;

  if (!allowedKinds.includes(kind)) {
    return NextResponse.json(
      { error: "Validation failed", details: "kind must be llm or embedding" },
      { status: 400 },
    );
  }

  await prisma.userApiKey.deleteMany({
    where: { userId: session.user.id, kind },
  });

  return NextResponse.json({ message: "Deleted" });
}
