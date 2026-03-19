"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { useProject } from "@/lib/api/hooks";
import { useTranslation } from "@/lib/i18n";

import { ChatTab } from "@/components/projects/chat-tab";
import { SourcesTab } from "@/components/projects/sources-tab";
import { EmbedTab } from "@/components/projects/embed-tab";
import { AnalyticsTab } from "@/components/projects/analytics-tab";
import { SettingsTab } from "@/components/projects/settings-tab";
import { CustomizeTab } from "@/components/projects/customize-tab";
import { BotSettingsPanel } from "@/components/chatbots/bot-settings-panel";
import { LogsTab } from "@/components/projects/logs-tab";
import { LeadsTab } from "@/components/projects/leads-tab";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { t } = useTranslation();

  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const activeTab = searchParams?.get("tab") || "sources";

  // Helper to navigate between tabs via sidebar (also used by ChatTab)
  const setActiveTab = (tab: string) => {
    router.push(`/projects/${projectId}?tab=${tab}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <AppIcon name="Loader2" className="h-8 w-8 animate-spin-slow text-brand" />
            <p className="animate-pulse">{t("workspace.loading")}</p>
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
            <h2 className="text-2xl font-bold mb-2">{t("workspace.projectNotFound")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("workspace.projectNotFoundDesc")}
            </p>
            <Button asChild className="hover-lift">
              <Link href="/projects">
                <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                {t("workspace.backToDashboard")}
              </Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasDocuments = project.documentCount > 0;

  return (
    <MainLayout>
      <div className="flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto animate-in fade-in duration-300">
        {/* Slim Project Header */}
        <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{t("workspace.manageSubtitle")}</p>
          </div>
        </div>

        {/* Tab Content — rendered based on URL ?tab= param */}
        <div className="flex-1 min-h-0 relative w-full flex flex-col">
          {activeTab === "chat" && (
            <div className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-200">
              <ChatTab projectId={projectId} project={project} hasDocuments={hasDocuments} onNavigateToSources={() => setActiveTab("sources")} />
            </div>
          )}

          {activeTab === "sources" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <SourcesTab projectId={projectId} project={project} refetch={refetch} />
            </div>
          )}

          {activeTab === "botconfig" && (
            <div className="flex-1 min-h-0 overflow-y-auto pb-8 animate-in fade-in duration-200">
              <BotSettingsPanel projectId={projectId} />
            </div>
          )}

          {activeTab === "customize" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <CustomizeTab projectId={projectId} project={project} refetch={refetch} />
            </div>
          )}

          {activeTab === "embed" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <EmbedTab projectId={projectId} project={project} />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <AnalyticsTab projectId={projectId} />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <SettingsTab projectId={projectId} project={project} refetch={refetch} />
            </div>
          )}

          {activeTab === "logs" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <LogsTab projectId={projectId} />
            </div>
          )}

          {activeTab === "leads" && (
            <div className="flex-1 min-h-0 animate-in fade-in duration-200">
              <LeadsTab projectId={projectId} />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
