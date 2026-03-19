"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useProject } from "@/lib/api/hooks";
import { AppIcon } from "@/components/ui/app-icon";
import { useTranslation } from "@/lib/i18n";

const TAB_LABELS: Record<string, string> = {
  sources: "Sources",
  chat: "Chat Preview",
  botconfig: "Bot Config",
  customize: "Customize",
  embed: "Embed",
  analytics: "Analytics",
  logs: "Logs",
  leads: "Leads",
  settings: "Settings",
};

export function TopNavbar() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const projectId = params?.id as string | undefined;
  const { data: project } = useProject(projectId || "");
  const activeTab = searchParams?.get("tab");

  // Don't render on landing / auth pages
  if (!pathname || pathname === "/" || pathname.startsWith("/auth")) return null;

  // Build breadcrumb segments
  const crumbs: { label: string; href?: string }[] = [];

  const segments = pathname.split("/").filter(Boolean);

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1 && !activeTab;

    if (segment.toLowerCase() === "projects" && index === 0) {
      crumbs.push({ label: t("sidebar.dashboard"), href: isLast ? undefined : "/projects" });
    } else if (segment === projectId && project) {
      crumbs.push({ label: project.name, href: isLast && !activeTab ? undefined : `/projects/${projectId}` });
    } else if (segment === "new") {
      crumbs.push({ label: t("sidebar.newChatbot") || "New Chatbot" });
    } else if (segment === "settings") {
      crumbs.push({ label: t("settings.title") });
    } else {
      const formatted = segment
        .replace(/-/g, " ")
        .replace(/([A-Z])/g, " $1")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      crumbs.push({ label: formatted, href: isLast ? undefined : href });
    }
  });

  // If there's an active tab inside a project, add it as the last crumb
  if (activeTab && projectId) {
    crumbs.push({ label: TAB_LABELS[activeTab] || activeTab });
  }

  return (
    <header className="h-12 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center px-4 gap-3 z-30 sticky top-0">
      {/* Persistent Logo + App Name */}
      <Link href="/projects" className="flex items-center gap-2 shrink-0 group">
        <Image
          src="/images/clientExpressLogo.png"
          alt="ClientExpress"
          width={26}
          height={26}
          className="rounded-md object-contain bg-primary/10 group-hover:shadow-sm transition-shadow"
        />
        <span className="font-bold tracking-tight text-foreground text-[15px] hidden sm:inline">
          ClientExpress
        </span>
      </Link>

      {/* Divider */}
      <div className="h-5 w-px bg-border/60 shrink-0" />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-hidden">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <AppIcon name="ChevronRight" className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                {isLast || !crumb.href ? (
                  <span className="font-medium text-foreground truncate max-w-[180px]" aria-current={isLast ? "page" : undefined}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors truncate max-w-[180px]">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}
