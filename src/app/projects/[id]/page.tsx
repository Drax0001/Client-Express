"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MessageSquare, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MainLayout } from "@/components/layout/main-layout"
import { UploadInterface } from "@/components/documents/upload-interface"
import { DocumentList } from "@/components/documents/document-list"
import { useProject } from "@/lib/api/hooks"
import { StatusBadge } from "@/components/data/status-badge"

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string

  const { data: project, isLoading, error } = useProject(projectId)

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
    )
  }

  if (error || !project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">Project not found</div>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-muted-foreground">
                Manage documents and chat with your knowledge base
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{project.documentCount} documents</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>

            <Button asChild>
              <Link href={`/projects/${projectId}/chat`}>
                <MessageSquare className="mr-2 h-4 w-4" />
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
              documents={[]} // TODO: Fetch documents from API
              onRetry={(documentId) => {
                // TODO: Implement document retry
                console.log("Retry document", documentId)
              }}
              onDelete={(documentId) => {
                // TODO: Implement document deletion
                console.log("Delete document", documentId)
              }}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
                <p className="text-muted-foreground">
                  Add documents to your knowledge base. Supported formats: PDF, DOCX, TXT files, or web URLs.
                </p>
              </div>

              <UploadInterface
                projectId={projectId}
                onUploadSuccess={() => {
                  // TODO: Refresh document list
                  console.log("Upload successful")
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}