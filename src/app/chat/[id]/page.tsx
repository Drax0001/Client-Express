import { prisma } from "../../../../lib/prisma";
import { notFound } from "next/navigation";

import { FullscreenChat } from "@/components/chat/fullscreen-chat";
import { Providers } from "@/components/providers";

export default async function PublicChatPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            name: true,
            modules: true,
            branding: true,
        },
    });

    if (!project) notFound();

    return (
        <Providers>
            <FullscreenChat
                projectId={projectId}
                projectName={project.name}
                modules={project.modules as any}
                branding={project.branding as any}
            />
        </Providers>
    );
}
