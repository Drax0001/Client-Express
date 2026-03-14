"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/layout/main-layout";
import { useProject } from "@/lib/api/hooks";

import { ChatTab } from "@/components/projects/chat-tab";
import { SourcesTab } from "@/components/projects/sources-tab";
import { EmbedTab } from "@/components/projects/embed-tab";
import { AnalyticsTab } from "@/components/projects/analytics-tab";
import { SettingsTab } from "@/components/projects/settings-tab";
import { BotSettingsPanel } from "@/components/chatbots/bot-settings-panel";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const [activeTab, setActiveTab] = useState("sources");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <AppIcon name="Loader2" className="h-8 w-8 animate-spin-slow text-brand" />
            <p className="animate-pulse">Loading project workspace...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="AlertTriangle" className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild className="hover-lift">
              <Link href="/projects">
                <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasDocuments = project.documentCount > 0;
  const chatBranding = project?.branding;

  return (
    <MainLayout>
      <div className="flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto animate-in fade-in duration-300">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden shadow-sm"
              style={chatBranding?.primaryColor ? { backgroundColor: chatBranding.primaryColor + '1a', borderColor: chatBranding.primaryColor + '33' } : { backgroundColor: 'hsl(var(--brand) / 0.1)', borderColor: 'hsl(var(--brand) / 0.2)' }}
            >
              {chatBranding?.logoUrl ? (
                <img src={chatBranding.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <AppIcon name="Bot" className="h-6 w-6" style={{ color: chatBranding?.primaryColor || 'hsl(var(--brand))' }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground">Manage your chatbot&apos;s knowledge and settings.</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-transparent h-auto min-h-14 p-0 shrink-0 border-b border-border/60 w-full justify-start overflow-visible overflow-x-auto custom-scrollbar flex-nowrap">
            <TabsTrigger
              value="chat"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 mr-6 h-full gap-2 transition-colors hover:text-foreground"
            >
              <AppIcon name="MessageSquare" className="h-4 w-4" />
              Chat Preview
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 mr-6 h-full gap-2 transition-colors hover:text-foreground"
            >
              <AppIcon name="Database" className="h-4 w-4" />
              Knowledge Sources
            </TabsTrigger>
            <TabsTrigger
              value="botconfig"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 mr-6 h-full gap-2 transition-colors hover:text-foreground"
            >
              <AppIcon name="Cpu" className="h-4 w-4" />
              Bot Config
            </TabsTrigger>
            <TabsTrigger
              value="embed"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 mr-6 h-full gap-2 transition-colors hover:text-foreground"
            >
              <AppIcon name="Code" className="h-4 w-4" />
              Embed Widget
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 mr-6 h-full gap-2 transition-colors hover:text-foreground"
            >
              <AppIcon name="BarChart" className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 h-full gap-2 transition-colors hover:text-foreground"
            >
              <AppIcon name="Settings" className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 relative mt-6 w-full">
            <TabsContent value="chat" className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none">
              <ChatTab projectId={projectId} project={project} hasDocuments={hasDocuments} onNavigateToSources={() => setActiveTab("sources")} />
            </TabsContent>

            <TabsContent value="sources" className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none">
              <SourcesTab projectId={projectId} project={project} refetch={refetch} />
            </TabsContent>

            <TabsContent value="botconfig" className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none max-w-5xl overflow-y-auto pb-8">
              <BotSettingsPanel projectId={projectId} />
            </TabsContent>

            <TabsContent value="embed" className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none">
              <EmbedTab projectId={projectId} project={project} />
            </TabsContent>

            <TabsContent value="analytics" className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none">
              <AnalyticsTab projectId={projectId} />
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none">
              <SettingsTab projectId={projectId} project={project} refetch={refetch} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
