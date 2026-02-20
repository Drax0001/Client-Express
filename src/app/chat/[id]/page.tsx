import { prisma } from "../../../../lib/prisma";
import { notFound } from "next/navigation";
import { PublicChat } from "@/components/chat/public-chat";
import { Providers } from "@/components/providers";

export default async function PublicChatPage({
    params,
}: {
    params: { id: string };
}) {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true }
    });

    if (!project) notFound();

    return (
        <Providers>
            <div className="w-full h-screen bg-background overflow-hidden flex flex-col">
                <header className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-card shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center font-bold text-brand shadow-sm">
                            {(project.name || "C")[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-[15px]">{project.name} Assistant</span>
                    </div>
                </header>
                <main className="flex-1 overflow-hidden relative">
                    <PublicChat projectId={projectId} projectName={project.name} />
                </main>
            </div>
        </Providers>
    );
}
