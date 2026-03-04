import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "../../../../../../../lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
            { error: "Invalid file type. Allowed: PNG, JPG, WebP, SVG, GIF" },
            { status: 400 }
        );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 2MB" },
            { status: 400 }
        );
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine extension
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const filename = `${projectId}.${ext}`;

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
        await mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        const logoUrl = `/uploads/logos/${filename}`;

        // Update project branding with new logo URL
        const existing = (project.branding as any) || {};
        await prisma.project.update({
            where: { id: projectId },
            data: {
                branding: { ...existing, logoUrl },
            },
        });

        return NextResponse.json({ success: true, logoUrl });
    } catch (error: any) {
        console.error("Logo upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload logo" },
            { status: 500 }
        );
    }
}
