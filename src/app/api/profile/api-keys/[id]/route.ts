import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: keyId } = await params;

    // Verify ownership before deleting
    const existingKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!existingKey || existingKey.userId !== session.user.id) {
      return NextResponse.json(
        { error: "API Key not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/profile/api-keys/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
