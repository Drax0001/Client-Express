import { EmbedWidget } from "../../../components/chat/embed-widget";
import { prisma } from "../../../../lib/prisma";
import { notFound } from "next/navigation";
import { Providers } from "@/components/providers";

export default async function WidgetPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, leadCaptureEnabled: true, leadCaptureFields: true, branding: true, modules: true }
    });

    // If the project doesn't exist, we don't render the chat interface
    if (!project) {
        notFound();
    }

    return (
        <Providers>
            <div className={`w-full h-screen bg-transparent pointer-events-none flex justify-end items-end p-4 sm:p-6 overflow-hidden ${(project.branding as any)?.theme === 'dark' ? 'dark' : ''}`}>
                <EmbedWidget 
                  projectId={projectId} 
                  projectName={project.name} 
                  leadCaptureEnabled={project.leadCaptureEnabled}
                  leadCaptureFields={project.leadCaptureFields as string[] | null}
                  branding={project.branding as any}
                  modules={project.modules as any}
                />
            </div>
        </Providers>
    );
}
