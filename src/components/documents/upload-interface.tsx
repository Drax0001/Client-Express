"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUploadArea } from "./file-upload-area"
import { UrlUploadInput } from "./url-upload-input"
import { DocumentUploadProgress } from "./document-upload-progress"
import { useUploadDocument, useUsage } from "@/lib/api/hooks"
import { UploadDocumentRequest } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { AppIcon } from "@/components/ui/app-icon"
import { UpgradeModal } from "@/components/projects/upgrade-modal"

interface UploadInterfaceProps {
  projectId: string
  onUploadSuccess?: () => void
  className?: string
  currentDocumentCount?: number
}

interface UploadItem {
  id: string
  fileName: string
  status: "uploading" | "processing" | "completed" | "failed"
  progress?: number
  error?: string
  retry?: () => void
}

interface QAPair {
  question: string
  answer: string
}

export function UploadInterface({
  projectId,
  onUploadSuccess,
  className,
  currentDocumentCount = 0
}: UploadInterfaceProps) {
  const [uploads, setUploads] = React.useState<UploadItem[]>([])
  const uploadMutation = useUploadDocument()
  const { data: usageData } = useUsage()
  
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false)

  // Text paste state
  const [pastedText, setPastedText] = React.useState("")
  const [textSaving, setTextSaving] = React.useState(false)

  // Q&A state
  const [qaPairs, setQaPairs] = React.useState<QAPair[]>([{ question: "", answer: "" }])
  const [qaSaving, setQaSaving] = React.useState(false)

  const pollDocumentUntilDone = React.useCallback(
    async (documentId: string, uploadId: string) => {
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
        const startedAt = Date.now()
        const timeoutMs = 120000

        while (Date.now() - startedAt < timeoutMs) {
          const res = await fetch(`/api/documents/${documentId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })

          if (!res.ok) throw new Error(`Failed to check document status (${res.status})`)

          const doc = await res.json()

          if (doc.status === "ready") {
            setUploads(prev => prev.map(u =>
              u.id === uploadId ? { ...u, status: "completed" as const, progress: 100 } : u,
            ))
            onUploadSuccess?.()
            return
          }

          if (doc.status === "failed") {
            setUploads(prev => prev.map(u =>
              u.id === uploadId
                ? { ...u, status: "failed" as const, progress: 100, error: doc.errorMessage || "Document processing failed" }
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

  const checkLimit = (incomingCount: number) => {
    if (!usageData) return true
    if (currentDocumentCount + incomingCount > usageData.limits.maxSourcesTotal) {
      setShowUpgradeModal(true)
      return false
    }
    return true
  }

  /** Shared helper: upload any Blob as a named .txt file */
  const uploadBlob = async (blob: Blob, fileName: string) => {
    if (!checkLimit(1)) return

    const uploadId = `${Date.now()}-${Math.random()}`
    setUploads(prev => [...prev, { id: uploadId, fileName, status: "uploading" as const, progress: 0 }])
    try {
      const file = new File([blob], fileName, { type: "text/plain" })
      const uploadedDoc = await uploadMutation.mutateAsync({ projectId, file } as UploadDocumentRequest)
      setUploads(prev => prev.map(u =>
        u.id === uploadId ? { ...u, status: "processing" as const, progress: 10 } : u,
      ))
      await pollDocumentUntilDone(uploadedDoc.id, uploadId)
    } catch (error: any) {
      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, status: "failed" as const, error: error?.error?.message || "Upload failed" }
          : u,
      ))
    }
  }

  const handleFileUpload = async (files: File[]) => {
    if (!checkLimit(files.length)) return

    const newUploads: UploadItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      fileName: file.name,
      status: "uploading" as const,
      progress: 0,
    }))
    setUploads(prev => [...prev, ...newUploads])

    for (const file of files) {
      const uploadId = newUploads.find(u => u.fileName === file.name)?.id
      if (!uploadId) continue
      try {
        const progressInterval = setInterval(() => {
          setUploads(prev => prev.map(u =>
            u.id === uploadId && u.status === "uploading"
              ? { ...u, progress: Math.min((u.progress || 0) + 10, 90) }
              : u
          ))
        }, 200)

        const uploadedDoc = await uploadMutation.mutateAsync({ projectId, file } as UploadDocumentRequest)
        clearInterval(progressInterval)
        setUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, status: "processing" as const, progress: 10 } : u
        ))
        await pollDocumentUntilDone(uploadedDoc.id, uploadId)
      } catch (error: any) {
        setUploads(prev => prev.map(u =>
          u.id === uploadId
            ? { ...u, status: "failed" as const, error: error.error?.message || "Upload failed", retry: () => handleFileRetry(file, uploadId) }
            : u
        ))
      }
    }
  }

  const handleFileRetry = async (file: File, uploadId: string) => {
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, status: "uploading" as const, progress: 0, error: undefined } : u
    ))
    await handleFileUpload([file])
  }

  const handleUrlUpload = async (url: string) => {
    if (!checkLimit(1)) return

    const uploadId = `${Date.now()}-${Math.random()}`
    setUploads(prev => [...prev, { id: uploadId, fileName: url, status: "uploading" as const, progress: 0 }])
    try {
      const uploadedDoc = await uploadMutation.mutateAsync({ projectId, url } as UploadDocumentRequest)
      setUploads(prev => prev.map(u =>
        u.id === uploadId ? { ...u, status: "processing" as const, progress: 10 } : u
      ))
      await pollDocumentUntilDone(uploadedDoc.id, uploadId)
    } catch (error: any) {
      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, status: "failed" as const, error: error.error?.message || "Upload failed", retry: () => handleUrlRetry(url, uploadId) }
          : u
      ))
    }
  }

  const handleUrlRetry = async (url: string, uploadId: string) => {
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, status: "uploading" as const, progress: 0, error: undefined } : u
    ))
    await handleUrlUpload(url)
  }

  const handleSaveText = async () => {
    if (!pastedText.trim()) return
    setTextSaving(true)
    await uploadBlob(new Blob([pastedText.trim()], { type: "text/plain" }), `text-${Date.now()}.txt`)
    setPastedText("")
    setTextSaving(false)
  }

  const handleSaveQA = async () => {
    const valid = qaPairs.filter(p => p.question.trim() && p.answer.trim())
    if (!valid.length) return
    setQaSaving(true)
    const content = valid.map(p => `Q: ${p.question.trim()}\nA: ${p.answer.trim()}`).join("\n\n")
    await uploadBlob(new Blob([content], { type: "text/plain" }), `qa-pairs-${Date.now()}.txt`)
    setQaPairs([{ question: "", answer: "" }])
    setQaSaving(false)
  }

  const updatePair = (idx: number, field: "question" | "answer", value: string) =>
    setQaPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))

  const addPair = () => setQaPairs(prev => [...prev, { question: "", answer: "" }])
  const removePair = (idx: number) => setQaPairs(prev => prev.filter((_, i) => i !== idx))
  const handleCancel = (id: string) => setUploads(prev => prev.filter(u => u.id !== id))
  const clearCompleted = () => setUploads(prev => prev.filter(u => u.status !== "completed"))

  const activeUploads = uploads.filter(u => u.status === "uploading" || u.status === "processing")
  const hasCompleted = uploads.some(u => u.status === "completed")
  const validPairCount = qaPairs.filter(p => p.question.trim() && p.answer.trim()).length

  return (
    <div className={className}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="files" className="text-xs sm:text-sm">Upload Files</TabsTrigger>
          <TabsTrigger value="url" className="text-xs sm:text-sm">Add URL</TabsTrigger>
          <TabsTrigger value="text" className="text-xs sm:text-sm">Paste Text</TabsTrigger>
          <TabsTrigger value="qa" className="text-xs sm:text-sm">Q&amp;A Pairs</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          <FileUploadArea onFileSelect={handleFileUpload} disabled={uploadMutation.isPending} />
        </TabsContent>

        <TabsContent value="url" className="space-y-6">
          <UrlUploadInput onUrlSubmit={handleUrlUpload} disabled={uploadMutation.isPending} />
        </TabsContent>

        {/* ── Text Paste ───────────────────────────────────────────── */}
        <TabsContent value="text" className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Paste any text — articles, notes, documentation — and it becomes a searchable knowledge source.
          </p>
          <Textarea
            placeholder="Paste your content here..."
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            rows={10}
            className="resize-y font-mono text-sm"
            disabled={textSaving}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{pastedText.length.toLocaleString()} characters</span>
            <Button
              onClick={handleSaveText}
              disabled={!pastedText.trim() || textSaving}
              size="sm"
              className="bg-brand hover:bg-brand-hover text-white"
            >
              {textSaving
                ? <><AppIcon name="Loader2" className="mr-1.5 h-3.5 w-3.5 animate-spin-slow" />Saving...</>
                : <><AppIcon name="Save" className="mr-1.5 h-3.5 w-3.5" />Save as Source</>}
            </Button>
          </div>
        </TabsContent>

        {/* ── Q&A Pairs ────────────────────────────────────────────── */}
        <TabsContent value="qa" className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Define explicit Q&amp;A pairs. The bot uses these as authoritative answers for matching questions.
          </p>
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {qaPairs.map((pair, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-3 border border-border/60 rounded-lg bg-muted/20">
                <Input
                  placeholder={`Question ${idx + 1}`}
                  value={pair.question}
                  onChange={e => updatePair(idx, "question", e.target.value)}
                  className="h-9 text-sm"
                  disabled={qaSaving}
                />
                <Input
                  placeholder="Answer"
                  value={pair.answer}
                  onChange={e => updatePair(idx, "answer", e.target.value)}
                  className="h-9 text-sm"
                  disabled={qaSaving}
                />
                <Button
                  variant="ghost" size="sm"
                  onClick={() => removePair(idx)}
                  disabled={qaPairs.length === 1 || qaSaving}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                >
                  <AppIcon name="Trash2" className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addPair} disabled={qaSaving}>
              <AppIcon name="Plus" className="mr-1.5 h-3.5 w-3.5" />Add Row
            </Button>
            <Button
              onClick={handleSaveQA}
              disabled={validPairCount === 0 || qaSaving}
              size="sm"
              className="bg-brand hover:bg-brand-hover text-white"
            >
              {qaSaving
                ? <><AppIcon name="Loader2" className="mr-1.5 h-3.5 w-3.5 animate-spin-slow" />Saving...</>
                : <><AppIcon name="Save" className="mr-1.5 h-3.5 w-3.5" />Save as Source ({validPairCount} pairs)</>}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Progress list ─────────────────────────────────────────── */}
      {uploads.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upload Progress ({uploads.length})</h3>
            {hasCompleted && (
              <button onClick={clearCompleted} className="text-sm text-muted-foreground hover:text-foreground">
                Clear completed
              </button>
            )}
          </div>
          <div className="space-y-3">
            {uploads.map(upload => (
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

      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        title="Source Limit Reached"
        description={`You have reached your limit of ${usageData?.limits.maxSourcesTotal} sources for your current plan. Upgrade to unlock more capacity.`}
        requiredPlan="PRO"
      />
    </div>
  )
}
