"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUploadArea } from "./file-upload-area"
import { UrlUploadInput } from "./url-upload-input"
import { DocumentUploadProgress } from "./document-upload-progress"
import { useUploadDocument } from "@/lib/api/hooks"
import { UploadDocumentRequest } from "@/lib/api/types"

interface UploadInterfaceProps {
  projectId: string
  onUploadSuccess?: () => void
  className?: string
}

interface UploadItem {
  id: string
  fileName: string
  status: "uploading" | "processing" | "completed" | "failed"
  progress?: number
  error?: string
  retry?: () => void
}

export function UploadInterface({
  projectId,
  onUploadSuccess,
  className,
}: UploadInterfaceProps) {
  const [uploads, setUploads] = React.useState<UploadItem[]>([])
  const uploadMutation = useUploadDocument()

  const pollDocumentUntilDone = React.useCallback(
    async (documentId: string, uploadId: string) => {
      // Drive a visible progress bar while we wait for background processing
      let processingProgress = 10

      const processingTick = setInterval(() => {
        processingProgress = Math.min(processingProgress + 3, 95)
        setUploads(prev => prev.map(u =>
          u.id === uploadId && u.status === "processing"
            ? { ...u, progress: processingProgress }
            : u,
        ))
      }, 600)

      try {
        // Poll until ready/failed (or timeout)
        const startedAt = Date.now()
        const timeoutMs = 120000

        while (Date.now() - startedAt < timeoutMs) {
          const res = await fetch(`/api/documents/${documentId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })

          if (!res.ok) {
            throw new Error(`Failed to check document status (${res.status})`)
          }

          const doc = await res.json()

          if (doc.status === "ready") {
            setUploads(prev => prev.map(u =>
              u.id === uploadId
                ? { ...u, status: "completed" as const, progress: 100 }
                : u,
            ))
            onUploadSuccess?.()
            return
          }

          if (doc.status === "failed") {
            setUploads(prev => prev.map(u =>
              u.id === uploadId
                ? {
                    ...u,
                    status: "failed" as const,
                    progress: 100,
                    error: doc.errorMessage || "Document processing failed",
                  }
                : u,
            ))
            return
          }

          await new Promise(r => setTimeout(r, 1200))
        }

        throw new Error("Timed out waiting for document processing")
      } finally {
        clearInterval(processingTick)
      }
    },
    [onUploadSuccess],
  )

  const handleFileUpload = async (files: File[]) => {
    const newUploads: UploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      fileName: file.name,
      status: "uploading" as const,
      progress: 0,
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Process each file
    for (const file of files) {
      const uploadId = newUploads.find(u => u.fileName === file.name)?.id
      if (!uploadId) continue

      try {
        console.log("UploadInterface: Starting upload for file:", {
          name: file.name,
          size: file.size,
          type: file.type,
          projectId,
        });

        // Simulate upload progress (in real app, this would come from upload progress)
        const progressInterval = setInterval(() => {
          setUploads(prev => prev.map(upload =>
            upload.id === uploadId && upload.status === "uploading"
              ? { ...upload, progress: Math.min((upload.progress || 0) + 10, 90) }
              : upload
          ))
        }, 200)

        const uploadRequest: UploadDocumentRequest = {
          projectId,
          file,
        }

        console.log("UploadInterface: Sending upload request");
        const uploadedDoc = await uploadMutation.mutateAsync(uploadRequest)

        clearInterval(progressInterval)
        setUploads(prev => prev.map(upload =>
          upload.id === uploadId
            ? { ...upload, status: "processing" as const, progress: 10 }
            : upload
        ))

        // Wait for background processing (extract → chunk → embed → store)
        await pollDocumentUntilDone(uploadedDoc.id, uploadId)
      } catch (error: any) {
        setUploads(prev => prev.map(upload =>
          upload.id === uploadId
            ? {
                ...upload,
                status: "failed" as const,
                error: error.error?.message || "Upload failed",
                retry: () => handleFileRetry(file, uploadId)
              }
            : upload
        ))
      }
    }
  }

  const handleFileRetry = async (file: File, uploadId: string) => {
    setUploads(prev => prev.map(upload =>
      upload.id === uploadId
        ? { ...upload, status: "uploading" as const, progress: 0, error: undefined }
        : upload
    ))

    await handleFileUpload([file])
  }

  const handleUrlUpload = async (url: string) => {
    const uploadId = `${Date.now()}-${Math.random()}`

    setUploads(prev => [...prev, {
      id: uploadId,
      fileName: url,
      status: "uploading" as const,
      progress: 0,
    }])

    try {
      const uploadRequest: UploadDocumentRequest = {
        projectId,
        url,
      }

      const uploadedDoc = await uploadMutation.mutateAsync(uploadRequest)

      setUploads(prev => prev.map(upload =>
        upload.id === uploadId
          ? { ...upload, status: "processing" as const, progress: 10 }
          : upload
      ))

      await pollDocumentUntilDone(uploadedDoc.id, uploadId)
    } catch (error: any) {
      setUploads(prev => prev.map(upload =>
        upload.id === uploadId
          ? {
              ...upload,
              status: "failed" as const,
              error: error.error?.message || "Upload failed",
              retry: () => handleUrlRetry(url, uploadId)
            }
          : upload
      ))
    }
  }

  const handleUrlRetry = async (url: string, uploadId: string) => {
    setUploads(prev => prev.map(upload =>
      upload.id === uploadId
        ? { ...upload, status: "uploading" as const, progress: 0, error: undefined }
        : upload
    ))

    await handleUrlUpload(url)
  }

  const handleCancel = (uploadId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }

  const clearCompleted = () => {
    setUploads(prev => prev.filter(upload => upload.status !== "completed"))
  }

  const activeUploads = uploads.filter(u => u.status === "uploading" || u.status === "processing")
  const hasCompletedUploads = uploads.some(u => u.status === "completed")

  return (
    <div className={className}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10 sm:h-10">
          <TabsTrigger value="files" className="text-sm touch-manipulation">
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="url" className="text-sm touch-manipulation">
            Add URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          <FileUploadArea
            onFileSelect={handleFileUpload}
            disabled={uploadMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-6">
          <UrlUploadInput
            onUrlSubmit={handleUrlUpload}
            disabled={uploadMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Upload Progress ({uploads.length})
            </h3>
            {hasCompletedUploads && (
              <button
                onClick={clearCompleted}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-3">
            {uploads.map((upload) => (
              <DocumentUploadProgress
                key={upload.id}
                fileName={upload.fileName}
                status={upload.status}
                progress={upload.progress}
                error={upload.error}
                onRetry={upload.retry}
                onCancel={() => handleCancel(upload.id)}
              />
            ))}
          </div>

          {activeUploads.length === 0 && uploads.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>All uploads completed!</p>
              <p className="text-sm">Documents are being processed and will be available shortly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
