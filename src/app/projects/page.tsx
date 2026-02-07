"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/data/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCardSkeleton } from "@/components/ui/skeletons";
import { useProjects } from "@/lib/api/hooks";
import { useAppKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AppIcon } from "@/components/ui/app-icon";
import { useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function ProjectsPage() {
  // const { data: session, status } = useSession();
  const { data: projects, isLoading, error } = useProjects();
  const createProjectDialogRef = useRef<{ openDialog: () => void }>(null);

  useAppKeyboardShortcuts({
    createProject: () => createProjectDialogRef.current?.openDialog(),
  });

  // if (status === "loading") {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  //     </div>
  //   );
  // }

  // if (status === "unauthenticated") {
  //   redirect("/login");
  //   return null;
  // }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Your Knowledge Bases
            </h1>
            <p className="text-muted-foreground text-lg">
              Create and manage AI assistants powered by your documents.
            </p>
          </div>
          <CreateProjectDialog ref={createProjectDialogRef}>
            <Button className="shadow-soft flex items-center gap-2 px-6 py-3 rounded-xl font-medium">
              <AppIcon name="Plus" className="h-5 w-5" />
              Create Project
            </Button>
          </CreateProjectDialog>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">Failed to load projects</div>
            <p className="text-muted-foreground">
              {error.message || "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/10 opacity-80 rounded-full blur-2xl transform scale-150"></div>
              <div className="relative p-6 bg-primary/10 rounded-3xl shadow-soft">
                <AppIcon
                  name="Bot"
                  className="h-20 w-20 text-primary mx-auto"
                />
              </div>
            </div>
            <h3 className="text-2xl font-semibold mb-3">
              Ready to Build Your First Assistant?
            </h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Transform your documents into intelligent conversational AI assistants.
              Start by creating your first knowledge base.
            </p>
            <CreateProjectDialog>
              <Button className="shadow-soft px-8 py-4 rounded-xl font-medium text-lg">
                <AppIcon name="Plus" className="h-5 w-5 mr-2" />
                Create Your First Project
              </Button>
            </CreateProjectDialog>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                createdAt={new Date(project.createdAt)}
                documentCount={project.documentCount || 0}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
