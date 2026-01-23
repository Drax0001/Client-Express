"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/data/project-card";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCardSkeleton } from "@/components/ui/skeletons";
import { useProjects } from "@/lib/api/hooks";
import { useAppKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Bot, Plus, FileText, Loader2 } from "lucide-react";
import { useRef } from "react";

export default function Home() {
  const { data: projects, isLoading, error } = useProjects();
  const createProjectDialogRef = useRef<{ openDialog: () => void }>(null);

  // Keyboard shortcuts
  useAppKeyboardShortcuts({
    createProject: () => createProjectDialogRef.current?.openDialog(),
  });

  return (
    <MainLayout>
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-full blur-3xl transform scale-150"></div>
            <div className="relative flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-medium">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
                RAG Chatbot
              </h1>
            </div>
          </div>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your documents into intelligent conversational assistants.
            Upload PDFs, DOCX files, or web URLs to create AI-powered knowledge
            bases that provide accurate, context-aware responses.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-full border shadow-soft hover-lift transition-all">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">PDF, DOCX, TXT, URLs</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-full border shadow-soft hover-lift transition-all">
              <Bot className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">AI-Powered Chat</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-full border shadow-soft hover-lift transition-all">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Real-time Processing</span>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                Your Knowledge Bases
              </h2>
              <p className="text-muted-foreground text-lg">
                Create and manage AI assistants powered by your documents.
              </p>
            </div>
            <CreateProjectDialog ref={createProjectDialogRef}>
              <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-medium hover-lift flex items-center gap-2 px-6 py-3 rounded-xl font-semibold">
                <Plus className="h-5 w-5" />
                Create Project
              </Button>
            </CreateProjectDialog>
          </div>

          {isLoading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <div className="absolute inset-0 bg-gradient-secondary opacity-20 rounded-full blur-2xl transform scale-150"></div>
                <div className="relative p-6 bg-gradient-secondary rounded-3xl shadow-medium">
                  <Bot className="h-20 w-20 text-secondary-foreground mx-auto" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
                Ready to Build Your First Assistant?
              </h3>
              <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">
                Transform your documents into intelligent conversational AI
                assistants. Start by creating your first knowledge base.
              </p>
              <CreateProjectDialog>
                <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-medium hover-lift px-8 py-4 rounded-xl font-semibold text-lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Project
                </Button>
              </CreateProjectDialog>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

        {/* Features Section */}
        <div className="grid gap-8 md:grid-cols-3 mt-16">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Document Upload</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDFs, DOCX files, or provide URLs to build your knowledge
              base.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">AI-Powered Chat</h3>
            <p className="text-sm text-muted-foreground">
              Get accurate answers based only on your uploaded documents.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Project Isolation</h3>
            <p className="text-sm text-muted-foreground">
              Keep different knowledge domains separate with isolated projects.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
