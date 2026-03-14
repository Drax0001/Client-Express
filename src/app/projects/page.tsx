"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/data/project-card";
import { ProjectCardSkeleton } from "@/components/ui/skeletons";
import { useProjects } from "@/lib/api/hooks";
import { useAppKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AppIcon } from "@/components/ui/app-icon";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProjectsPage() {
  const { data: projects, isLoading: projectsLoading, error } = useProjects();
  const [usageData, setUsageData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch usage");
        return res.json();
      })
      .then((data) => setUsageData(data))
      .catch(console.error);
  }, []);

  useAppKeyboardShortcuts({
    createProject: () => {
      window.location.href = "/projects/new";
    },
  });

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-6xl mx-auto w-full">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Overview of your conversational AI projects and usage metrics.
            </p>
          </div>
          <Link href="/projects/new">
            <Button className="shadow-md hover:shadow-lg transition-all flex items-center gap-2 px-6 py-5 rounded-xl font-medium bg-foreground hover:bg-foreground/90 text-background">
              <AppIcon name="Plus" className="h-[18px] w-[18px]" />
              New Chatbot
            </Button>
          </Link>
        </div>

        {/* METRICS DASHBOARD */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Active Chatbots Metric */}
          <div className="p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="p-2 bg-brand/10 text-brand rounded-lg">
                <AppIcon name="Folder" className="h-4 w-4" />
              </div>
              <h3 className="font-medium text-sm">Active Chatbots</h3>
            </div>
            {projectsLoading ? (
              <div className="flex h-10 items-center">
                <div className="loader-creative-sm" />
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-foreground">{projects?.length || 0}</span>
                <span className="text-sm font-medium text-muted-foreground">projects</span>
              </div>
            )}
          </div>

          {/* Messages Metric */}
          <div className="p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="p-2 bg-success/10 text-success rounded-lg">
                <AppIcon name="MessageSquare" className="h-4 w-4" />
              </div>
              <h3 className="font-medium text-sm">Messages This Month</h3>
            </div>
            {!usageData ? (
              <div className="flex h-10 items-center">
                <div className="loader-creative-sm" />
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-foreground">{usageData.usage.messagesThisMonth}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {usageData.limits.maxMessagesPerMonth === 999999 ? "∞" : usageData.limits.maxMessagesPerMonth}
                </span>
              </div>
            )}
          </div>

          {/* Sources Metric */}
          <div className="p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="p-2 bg-info/10 text-info rounded-lg">
                <AppIcon name="Database" className="h-4 w-4" />
              </div>
              <h3 className="font-medium text-sm">Sources Indexed</h3>
            </div>
            {projectsLoading ? (
              <div className="flex h-10 items-center">
                <div className="loader-creative-sm" />
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-foreground">
                  {projects?.reduce((acc, p) => acc + (p.documentCount || 0), 0) || 0}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  total active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PROJECTS SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Your Chatbots</h2>
          </div>

          {projectsLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="loader-creative" aria-label="Loading projects..."></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 border border-destructive/20 bg-destructive/5 rounded-2xl">
              <div className="text-destructive mb-2 font-medium">Failed to load projects</div>
              <p className="text-muted-foreground mb-4">
                {error.message || "An unexpected error occurred."}
              </p>
              <Button
                variant="outline"
                className="hover:bg-destructive hover:text-white transition-colors"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-20 px-4 border border-border/60 border-dashed rounded-3xl bg-muted/10">
              <div className="relative mb-8 w-fit mx-auto">
                <div className="absolute inset-0 bg-brand/10 opacity-80 rounded-full blur-2xl transform scale-150"></div>
                <div className="relative p-5 bg-card border border-border rounded-3xl shadow-soft">
                  <AppIcon
                    name="Bot"
                    className="h-12 w-12 text-foreground"
                  />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-3 tracking-tight">
                No Chatbots Yet
              </h3>
              <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto leading-relaxed">
                Transform your documents into intelligent conversational AI assistants.
              </p>
              <Link href="/projects/new">
                <Button className="shadow-md px-8 py-5 rounded-xl font-medium text-base bg-brand hover:bg-brand-hover text-white transition-all hover:shadow-lg hover:-translate-y-0.5" >
                  <AppIcon name="Plus" className="h-5 w-5 mr-2" />
                  Create Your First Chatbot
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </MainLayout>
  );
}
