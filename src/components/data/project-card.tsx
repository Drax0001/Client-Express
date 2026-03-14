"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { useTranslation } from "@/lib/i18n";

interface ProjectCardProps {
  id: string;
  name: string;
  createdAt: Date;
  documentCount: number;
}

export function ProjectCard({
  id,
  name,
  createdAt,
  documentCount,
}: ProjectCardProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Card
      role="button"
      tabIndex={0}
      className="group relative overflow-hidden transition-all duration-200 touch-manipulation border border-border/60 shadow-medium bg-card cursor-pointer hover:shadow-strong"
      onClick={() => router.push(`/projects/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/projects/${id}`);
        }
      }}
    >
      <CardHeader className="pb-4 relative p-6">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-semibold leading-tight pr-2 text-foreground">
            <Link
              href={`/projects/${id}`}
              className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="line-clamp-2">{name}</span>
            </Link>
          </CardTitle>
          <DeleteProjectDialog projectId={id} projectName={name}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-manipulation flex-shrink-0 rounded-full transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <AppIcon name="Trash2" className="h-4 w-4" />
              <span className="sr-only">{t("common.delete")}</span>
            </Button>
          </DeleteProjectDialog>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AppIcon name="FileText" className="h-4 w-4" />
            <span>
              {documentCount} {documentCount === 1 ? t("common.document") : t("common.documents")}
            </span>
          </div>
          <Badge variant="secondary" className="font-medium">
            {documentCount > 0 ? t("common.ready") : t("common.empty")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-6">
        <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
          <Button asChild className="w-full font-medium">
            <Link href={`/projects/${id}`} className="flex items-center justify-center gap-2">
              <AppIcon name="Settings" className="h-4 w-4" />
              {t("common.manage")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full font-medium">
            <Link href={`/projects/${id}/chat`} className="flex items-center justify-center gap-2">
              <AppIcon name="MessageSquare" className="h-4 w-4" />
              {t("common.chat")}
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          {t("common.createdOn")} {createdAt.toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

