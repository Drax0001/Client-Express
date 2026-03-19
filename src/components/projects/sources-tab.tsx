"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadInterface } from "@/components/documents/upload-interface";
import { DocumentList } from "@/components/documents/document-list";
import { useToast } from "@/hooks/use-toast";
import { useDeleteDocument, useRetryDocument } from "@/lib/api/hooks";
import { useTranslation } from "@/lib/i18n";

interface SourcesTabProps {
  projectId: string;
  project: any;
  refetch: () => void;
}

export function SourcesTab({ projectId, project, refetch }: SourcesTabProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { t } = useTranslation();
  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 h-full overflow-y-auto pb-10">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{t("workspace.addNewSources")}</CardTitle>
              <CardDescription>
                {t("workspace.addNewSourcesDesc")}
              </CardDescription>
            </div>
            {/* Plan limits badge */}
            <div className="shrink-0 bg-background border border-border/60 rounded-xl px-4 py-2 text-sm space-y-1.5 min-w-[180px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs">{t("workspace.sourcesUploaded")}</span>
                <span className="font-semibold text-xs">
                  {project.documents?.length || 0}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t("workspace.maxFileSize")} {(session?.user as any)?.plan === "PRO" ? "10MB" : (session?.user as any)?.plan === "BUSINESS" ? "50MB" : "2MB"} per source
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <UploadInterface
            projectId={projectId}
            currentDocumentCount={project.documents?.length || 0}
            onUploadSuccess={() => {
              refetch();
              toast({ title: t("workspace.addedSuccess") });
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/60 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("workspace.trainedDocs")}</CardTitle>
            <CardDescription>
              {t("workspace.trainedDocsDesc")}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {project.documents?.length || 0} {t("workspace.total")}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DocumentList
            documents={project.documents || []}
            loading={false}
            onRetry={async (documentId) => {
              await retryDocument.mutateAsync(documentId);
              refetch();
            }}
            onDelete={async (documentId) => {
              await deleteDocument.mutateAsync(documentId);
              refetch();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

