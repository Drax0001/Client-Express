"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppIcon } from "@/components/ui/app-icon";
import { useProjects, useUsage, useProject } from "@/lib/api/hooks";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/lib/i18n";

// ------- Project sidebar nav items -------
const PROJECT_NAV_ITEMS = [
  { tab: "sources", icon: "Database" as const, labelKey: "workspace.knowledgeSources" },
  { tab: "chat", icon: "MessageSquare" as const, labelKey: "workspace.chatPreview" },
  { tab: "botconfig", icon: "Cpu" as const, labelKey: "workspace.botConfig" },
  { tab: "customize", icon: "Palette" as const, labelKey: "projectNav.customize" },
  { tab: "embed", icon: "Code" as const, labelKey: "workspace.embedWidget" },
  { tab: "analytics", icon: "BarChart" as const, labelKey: "workspace.analytics" },
  { tab: "logs", icon: "ScrollText" as const, labelKey: "projectNav.logs" },
  { tab: "leads", icon: "Users" as const, labelKey: "projectNav.leads" },
  { tab: "settings", icon: "Settings" as const, labelKey: "workspace.projectSettings" },
] as const;

// Mobile project nav (subset for bottom bar)
const MOBILE_PROJECT_NAV = [
  { tab: "sources", icon: "Database" as const, labelKey: "workspace.knowledgeSources" },
  { tab: "chat", icon: "MessageSquare" as const, labelKey: "workspace.chatPreview" },
  { tab: "analytics", icon: "BarChart" as const, labelKey: "workspace.analytics" },
  { tab: "settings", icon: "Settings" as const, labelKey: "workspace.projectSettings" },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const { data: projects, isLoading } = useProjects();
  const { data: usageData } = useUsage();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const { locale, setLocale, t } = useTranslation();

  // Determine if we're inside a project
  const projectId = params?.id as string | undefined;
  const isProjectContext = !!projectId && pathname?.startsWith(`/projects/${projectId}`);
  const { data: activeProject } = useProject(isProjectContext ? projectId : "");

  const activeTab = searchParams?.get("tab") || "sources";

  const displayName = session?.user?.name?.trim() || session?.user?.email || "User";
  const plan = usageData?.plan || "Free";
  const messagesThisMonth = usageData?.usage?.messagesThisMonth || 0;
  const maxMessages = usageData?.limits?.maxMessagesPerMonth || 50;
  const progressPercent = Math.min(100, Math.round((messagesThisMonth / maxMessages) * 100));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Desktop Sidebar ───
  return (
    <>
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-200 ${collapsed ? "w-16" : "w-[260px]"
          } bg-brand/5 border-r border-border/50 h-full overflow-hidden`}
      >
        {/* ─── Sidebar Content Wrapper with Slide Transition ─── */}
        <div className="relative flex-1 flex flex-col h-full overflow-hidden">
          {/* ─── GLOBAL NAV PANE ─── */}
          <div
            className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
              isProjectContext ? "-translate-x-full" : "translate-x-0"
            }`}
          >
            {/* Collapse Toggle */}
            <div className="flex items-center h-12 px-4 shrink-0 justify-end">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <AppIcon name={collapsed ? "PanelLeft" : "PanelLeftClose"} className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Nav Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide py-2 flex flex-col gap-6">
              {/* Section: Chatbots */}
              <div className="px-3">
                {!collapsed && (
                  <h4 className="px-2 text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground mb-2">
                    {t("sidebar.projects")}
                  </h4>
                )}
                <nav className="space-y-[2px]">
                  {isLoading && !collapsed ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">{t("common.loading")}</div>
                  ) : (
                    projects?.map((project) => {
                      const isActive = pathname?.startsWith(`/projects/${project.id}`);
                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all border border-transparent ${isActive
                            ? "bg-brand/10 text-brand font-medium border-brand/20 shadow-sm"
                            : "text-secondary-foreground hover:bg-brand/5 hover:border-brand/20 hover:text-brand"
                            } ${collapsed ? "justify-center" : ""}`}
                        >
                          <div className={`shrink-0 w-2 h-2 rounded-full ${isActive ? "bg-success" : "bg-muted-foreground/30"}`} />
                          {!collapsed && <span className="truncate">{project.name}</span>}
                        </Link>
                      );
                    })
                  )}

                  <Link
                    href="/projects/new"
                    className={`flex items-center gap-2.5 px-2 py-1.5 mt-1 rounded-md text-sm text-muted-foreground border border-transparent hover:border-brand/30 hover:bg-brand/5 hover:text-brand transition-all ${collapsed ? "justify-center" : ""}`}
                  >
                    <AppIcon name="Plus" className="h-[14px] w-[14px] shrink-0" />
                    {!collapsed && <span>{t("sidebar.newChatbot")}</span>}
                  </Link>
                </nav>
              </div>

              {/* Section: Account */}
              <div className="px-3 mt-auto">
                {!collapsed && (
                  <h4 className="px-2 text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground mb-2 border-t border-border pt-4">
                    {t("common.account")}
                  </h4>
                )}
                {collapsed && <div className="border-t border-border my-2 w-8 mx-auto" />}

                <nav className="space-y-[2px]">
                  <Link
                    href="/settings"
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-secondary-foreground border border-transparent hover:border-border/60 hover:bg-accent/40 hover:text-accent-foreground transition-all ${collapsed ? "justify-center" : ""}`}
                  >
                    <AppIcon name="Settings" className="h-[16px] w-[16px] shrink-0" />
                    {!collapsed && <span>{t("settings.title")}</span>}
                  </Link>
                  <Link
                    href="/settings?tab=billing"
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-secondary-foreground border border-transparent hover:border-border/60 hover:bg-accent/40 hover:text-accent-foreground transition-all ${collapsed ? "justify-center" : ""}`}
                  >
                    <AppIcon name="CreditCard" className="h-[16px] w-[16px] shrink-0" />
                    {!collapsed && <span>{t("settings.billing")}</span>}
                  </Link>
                </nav>
              </div>
            </div>

            {/* User Footer */}
            <SidebarFooter
              collapsed={collapsed}
              displayName={displayName}
              plan={plan}
              usageData={usageData}
              messagesThisMonth={messagesThisMonth}
              maxMessages={maxMessages}
              progressPercent={progressPercent}
              locale={locale}
              setLocale={setLocale}
              t={t}
            />
          </div>

          {/* ─── PROJECT NAV PANE ─── */}
          <div
            className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
              isProjectContext ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Back + Project Header */}
            <div className="shrink-0 border-b border-border/50">
              {/* Back link */}
              <div className="h-14 px-4 flex items-center">
                <Link
                  href="/projects"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <AppIcon name="ArrowLeft" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  {!collapsed && <span className="font-medium">{t("sidebar.projects")}</span>}
                </Link>
              </div>

              {/* Project Context Label */}
              {!collapsed && activeProject && (
                <div className="px-4 pb-3 flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden shadow-sm"
                    style={activeProject.branding?.primaryColor
                      ? { backgroundColor: activeProject.branding.primaryColor + '1a', borderColor: activeProject.branding.primaryColor + '33' }
                      : { backgroundColor: 'hsl(var(--brand) / 0.1)', borderColor: 'hsl(var(--brand) / 0.2)' }
                    }
                  >
                    {activeProject.branding?.logoUrl ? (
                      <img src={activeProject.branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <AppIcon
                        name="Bot"
                        className="h-4 w-4"
                        style={{ color: activeProject.branding?.primaryColor || 'hsl(var(--brand))' }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">{activeProject.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                      {t("workspace.ready")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Project Nav Items */}
            <div className="flex-1 overflow-y-auto scrollbar-hide py-3">
              <nav className="px-3 space-y-[2px] animate-stagger-in">
                {PROJECT_NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.tab;
                  return (
                    <Link
                      key={item.tab}
                      href={`/projects/${projectId}?tab=${item.tab}`}
                      className={`sidebar-link flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm border border-transparent ${
                        isActive
                          ? "sidebar-link-active bg-brand/10 text-brand font-medium border-brand/20 shadow-sm"
                          : "text-secondary-foreground hover:bg-brand/5 hover:border-brand/20 hover:text-brand"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <AppIcon name={item.icon} className={`h-4 w-4 shrink-0 transition-colors duration-200 ${isActive ? "text-brand" : "text-muted-foreground"}`} />
                      {!collapsed && <span className="truncate">{t(item.labelKey as any) || item.tab}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Footer (same as global) */}
            <SidebarFooter
              collapsed={collapsed}
              displayName={displayName}
              plan={plan}
              usageData={usageData}
              messagesThisMonth={messagesThisMonth}
              maxMessages={maxMessages}
              progressPercent={progressPercent}
              locale={locale}
              setLocale={setLocale}
              t={t}
            />
          </div>
        </div>
      </aside>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      {isProjectContext ? (
        // Project-context mobile nav
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around z-50 overflow-hidden px-2 pb-safe">
          <Link href="/projects" className="flex flex-col items-center justify-center w-16 h-full gap-1 text-muted-foreground">
            <AppIcon name="ArrowLeft" className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("common.back")}</span>
          </Link>
          {MOBILE_PROJECT_NAV.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <Link
                key={item.tab}
                href={`/projects/${projectId}?tab=${item.tab}`}
                className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${isActive ? "text-brand" : "text-muted-foreground"}`}
              >
                <AppIcon name={item.icon} className="h-5 w-5" />
                <span className="text-[10px] font-medium truncate">{t(item.labelKey as any) || item.tab}</span>
              </Link>
            );
          })}
        </nav>
      ) : (
        // Global mobile nav
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around z-50 overflow-hidden px-2 pb-safe">
          <Link href="/projects" className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${pathname === '/projects' || pathname?.startsWith('/projects/') ? "text-brand" : "text-muted-foreground"}`}>
            <AppIcon name="MessageSquare" className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("sidebar.projects")}</span>
          </Link>
          <Link href="/projects/new" className="flex flex-col items-center justify-center w-16 h-full gap-1 text-muted-foreground">
            <div className="bg-brand text-brand-foreground rounded-full w-8 h-8 flex items-center justify-center shadow-soft">
              <AppIcon name="Plus" className="h-5 w-5" />
            </div>
          </Link>
          <Link href="/settings" className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${pathname?.startsWith('/settings') ? "text-brand" : "text-muted-foreground"}`}>
            <AppIcon name="User" className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("common.account")}</span>
          </Link>
        </nav>
      )}
    </>
  );
}

// ─── Extracted Footer Component ───
function SidebarFooter({
  collapsed, displayName, plan, usageData,
  messagesThisMonth, maxMessages, progressPercent,
  locale, setLocale, t,
}: {
  collapsed: boolean;
  displayName: string;
  plan: string;
  usageData: any;
  messagesThisMonth: number;
  maxMessages: number;
  progressPercent: number;
  locale: string;
  setLocale: (l: any) => void;
  t: (key: any) => string;
}) {
  return (
    <div className="p-3 border-t border-border shrink-0">
      <div className="flex flex-col gap-3">
        {/* The Limits Progress Bar */}
        {!collapsed && usageData && (
          <div className="px-1 py-1 group">
            <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
              <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wide">Messages</span>
              <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">{messagesThisMonth.toLocaleString()} / {maxMessages === 999999 ? '∞' : maxMessages.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full bg-border/50 rounded-full overflow-hidden inner-shadow-soft">
              <div className={`h-full ${progressPercent > 95 ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]' : progressPercent > 80 ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-brand shadow-[0_0_8px_rgba(14,165,233,0.5)]'} transition-all duration-500`} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
            <span className="text-xs font-medium">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate leading-none mb-1">{displayName}</span>
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <span className="truncate">{plan} {t("common.planSuffix")}</span>
                <span>·</span>
                <Link href="/settings?tab=billing" className="text-brand hover:bg-brand/5 px-2 py-0.5 rounded border border-transparent hover:border-brand/30 transition-all font-medium flex items-center">
                  {t("common.upgrade")}
                </Link>
              </div>
            </div>
          )}
        </div>

        {!collapsed ? (
          <div className="flex items-center justify-between border-t border-border/50 pt-2 -mx-1 px-1">
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={() => setLocale(locale === "en" ? "fr" : "en")}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title={locale === "en" ? "Passer au Français" : "Switch to English"}
              >
                {locale === "en" ? "🇫🇷 FR" : "🇬🇧 EN"}
              </button>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <AppIcon name="LogOut" className="h-4 w-4" />
              {t("common.signOut")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 border-t border-border/50 pt-2">
            <ThemeToggle />
            <button
              onClick={() => setLocale(locale === "en" ? "fr" : "en")}
              className="p-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              title={locale === "en" ? "Passer au Français" : "Switch to English"}
            >
              {locale === "en" ? "🇫🇷" : "🇬🇧"}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Sign out"
            >
              <AppIcon name="LogOut" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
