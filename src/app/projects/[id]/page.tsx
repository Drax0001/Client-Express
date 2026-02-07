"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/layout/main-layout";
import { UploadInterface } from "@/components/documents/upload-interface";
import { DocumentList } from "@/components/documents/document-list";
import {
  useProject,
  useDeleteDocument,
  useRetryDocument,
} from "@/lib/api/hooks";
import { StatusBadge } from "@/components/data/status-badge";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { data: project, isLoading, error, refetch } = useProject(projectId);

  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();

  useEffect(() => {
    const hasInFlightDocs =
      (project?.documents || []).some(
        (d) => d.status === "pending" || d.status === "processing",
      ) ?? false;

    if (!hasInFlightDocs) return;

    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      refetch();
    }, 1500);

    return () => clearInterval(interval);
  }, [project?.documents, refetch]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-4"></div>
            <div className="h-4 bg-muted rounded w-64"></div>
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">Project not found</div>
          <p className="text-muted-foreground mb-4">
            The project you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
          <Button asChild>
            <Link href="/projects">
              <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {deleteDocument.isPending && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg font-medium">Deleting document...</span>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <p className="text-muted-foreground">
                Manage documents and chat with your knowledge base
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <AppIcon
                  name="FileText"
                  className="h-4 w-4 text-muted-foreground"
                />
                <span className="text-sm font-medium">
                  {project.documentCount} documents
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>

            <Button asChild>
              <Link href={`/projects/${projectId}/chat`}>
                <AppIcon name="MessageSquare" className="mr-2 h-4 w-4" />
                Start Chat
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            <DocumentList
              documents={project.documents || []}
              loading={isLoading}
              onRetry={async (documentId) => {
                try {
                  await retryDocument.mutateAsync(documentId);
                } catch (err) {
                  console.error("Retry failed", err);
                }
              }}
              onDelete={async (documentId) => {
                try {
                  await deleteDocument.mutateAsync(documentId);
                } catch (err) {
                  console.error("Delete failed", err);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
                <p className="text-muted-foreground">
                  Add documents to your knowledge base. Supported formats: PDF,
                  DOCX, TXT files, or web URLs.
                </p>
              </div>

              <UploadInterface
                projectId={projectId}
                onUploadSuccess={() => {
                  // Refresh project documents after upload
                  // The upload hook also invalidates project cache on success,
                  // but we trigger an additional refetch here to ensure list updates.
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  (async () => {
                    try {
                      // useProject will refetch automatically; force a refetch by
                      // invalidating the query via the browser's fetch.
                      // Simpler: reload the window to ensure latest data in this client
                      window.location.reload();
                    } catch (err) {
                      console.error("Refresh after upload failed", err);
                    }
                  })();
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
