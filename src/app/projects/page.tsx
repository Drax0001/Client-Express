"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/data/project-card";
import { useProjects, useUsage } from "@/lib/api/hooks";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UpgradeModal } from "@/components/projects/upgrade-modal";
import React, { useState } from "react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: projects, isLoading: projectsLoading, error } = useProjects();
  const { data: usageData } = useUsage();
  const { data: session } = useSession();
  const displayName = session?.user?.name?.trim() || session?.user?.email?.split('@')[0] || "User";

  // Time-based greeting logic
  const hour = new Date().getHours();
  let baseKey = "dashboard.goodEvening";
  if (hour < 12) baseKey = "dashboard.goodMorning";
  else if (hour < 18) baseKey = "dashboard.goodAfternoon";

  // Pseudo-random index based on hour and name to prevent React hydration errors
  const variantIndex = (hour + (displayName.charCodeAt(0) || 0)) % 3;
  const greetingKey = `${baseKey}.${variantIndex}` as any;

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (usageData && projects) {
      if (projects.length >= usageData.limits.maxProjects) {
        setShowUpgradeModal(true);
        return;
      }
    }
    router.push("/projects/new");
  };

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-6xl mx-auto w-full">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {t(greetingKey, { name: displayName })}
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              {t("dashboard.welcomeBack")}
            </p>
          </div>
          <Button
            className="shadow-md hover:shadow-lg transition-all flex items-center gap-2 px-6 py-5 rounded-xl font-medium bg-brand hover:bg-brand-hover text-white"
            onClick={handleCreateClick}
          >
            <AppIcon name="Plus" className="h-[18px] w-[18px]" />
            {t("dashboard.createNew")}
          </Button>
        </div>

        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          title="Chatbot Limit Reached"
          description={`You have reached your limit of ${usageData?.limits.maxProjects} chatbots for your current plan. Upgrade to unlock more capacity.`}
          requiredPlan="PRO"
        />

        {/* METRICS DASHBOARD */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Active Chatbots Metric */}
          <div className="group p-6 rounded-2xl bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-md border border-border/50 shadow-sm flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)] hover:-translate-y-1 hover:border-brand/30 transition-all duration-300">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="p-2 bg-brand/10 text-brand rounded-lg group-hover:scale-110 transition-transform duration-300">
                <AppIcon name="Folder" className="h-4 w-4" />
              </div>
              <h3 className="font-medium text-sm">{t("dashboard.activeChatbots")}</h3>
            </div>
            {projectsLoading ? (
              <div className="flex h-10 items-center">
                <div className="loader-creative-sm" />
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-foreground">{projects?.length || 0}</span>
                <span className="text-sm font-medium text-muted-foreground">{t("sidebar.projects").toLowerCase()}</span>
              </div>
            )}
          </div>

          {/* Messages Metric */}
          <div className="group p-6 rounded-2xl bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-md border border-border/50 shadow-sm flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)] hover:-translate-y-1 hover:border-success/30 transition-all duration-300">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="p-2 bg-success/10 text-success rounded-lg group-hover:scale-110 transition-transform duration-300">
                <AppIcon name="MessageSquare" className="h-4 w-4" />
              </div>
              <h3 className="font-medium text-sm">{t("dashboard.messagesThisMonth")}</h3>
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
          <div className="group p-6 rounded-2xl bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-md border border-border/50 shadow-sm flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)] hover:-translate-y-1 hover:border-info/30 transition-all duration-300">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <div className="p-2 bg-info/10 text-info rounded-lg group-hover:scale-110 transition-transform duration-300">
                <AppIcon name="Database" className="h-4 w-4" />
              </div>
              <h3 className="font-medium text-sm">{t("dashboard.sourcesIndexed")}</h3>
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
                  {t("dashboard.totalActive")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PROJECTS SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">{t("dashboard.yourChatbots")}</h2>
          </div>

          {projectsLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="loader-creative" aria-label={t("common.loading")}></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 border border-destructive/20 bg-destructive/5 rounded-2xl">
              <div className="text-destructive mb-2 font-medium">{t("auth.failed")}</div>
              <p className="text-muted-foreground mb-4">
                {error.message || t("auth.failed")}
              </p>
              <Button
                variant="outline"
                className="hover:bg-destructive hover:text-white transition-colors"
                onClick={() => window.location.reload()}
              >
                {t("common.tryAgain")}
              </Button>
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-20 px-4 border border-border/40 rounded-3xl bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
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
                {t("dashboard.noChatbots")}
              </h3>
              <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto leading-relaxed">
                {t("dashboard.noChatbotsDesc")}
              </p>
              <Link href="/projects/new">
                <Button className="shadow-md px-8 py-5 rounded-xl font-medium text-base bg-brand hover:bg-brand-hover text-white transition-all hover:shadow-lg hover:-translate-y-0.5" >
                  <AppIcon name="Plus" className="h-5 w-5 mr-2" />
                  {t("dashboard.createFirst")}
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

