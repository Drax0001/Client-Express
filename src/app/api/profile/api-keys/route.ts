import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../lib/prisma";
import * as bcrypt from "bcrypt";
import crypto from "crypto";
import { getUserPlanAndUsage } from "@/lib/limits";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(keys, { status: 200 });
  } catch (error) {
    console.error("GET /api/profile/api-keys error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 });
    }

    const usage = await getUserPlanAndUsage(session.user.id);
    if (usage.plan === "FREE") {
      return NextResponse.json(
        { error: "API Keys are only available on PRO and BUSINESS plans" },
        { status: 403 }
      );
    }

    // Generate a secure random crypto key
    const rawKey = "ce_" + crypto.randomBytes(32).toString("hex");
    const prefix = rawKey.slice(0, 11); // ce_xxxxxxxx
    const saltRounds = 10;
    const keyHash = await bcrypt.hash(rawKey, saltRounds);

    const newKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: body.name.trim(),
        keyHash,
        prefix,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // We must return the rawKey so the user can copy it once
    return NextResponse.json({ key: newKey, rawKey }, { status: 201 });
  } catch (error) {
    console.error("POST /api/profile/api-keys error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
