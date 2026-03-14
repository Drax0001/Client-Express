"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: string;
  filename: string;
  fileType: "pdf" | "docx" | "txt" | "url";
  status: "pending" | "processing" | "ready" | "failed";
  uploadedAt: string;
  errorMessage?: string | null;
}

interface DocumentListProps {
  documents: Document[];
  onRetry?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  loading?: boolean;
  className?: string;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "FileText",
  docx: "FileText",
  txt: "FileText",
  url: "Globe",
};

/** Blurred backdrop confirmation dialog */
function DeleteConfirmDialog({
  filename,
  onConfirm,
  onCancel,
}: {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AppIcon name="Trash2" className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Delete document?</h3>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 bg-muted/50 rounded-lg px-3 py-2 truncate font-mono">
          {filename}
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            <AppIcon name="Trash2" className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DocumentList({
  documents,
  onRetry,
  onDelete,
  loading = false,
  className,
}: DocumentListProps) {
  const [pendingDelete, setPendingDelete] = React.useState<Document | null>(null);

  const handleDeleteClick = (doc: Document) => {
    setPendingDelete(doc);
  };

  const confirmDelete = () => {
    if (pendingDelete && onDelete) {
      onDelete(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
                <div className="w-16 h-6 bg-muted rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <AppIcon name="Database" className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">No documents yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Upload PDFs, DOCX, TXT files or add URLs to start building your knowledge base.
        </p>
      </div>
    );
  }

  const failedDocs = documents.filter((d) => d.status === "failed");
  const readyCount = documents.filter((d) => d.status === "ready").length;
  const processingCount = documents.filter((d) => d.status === "processing" || d.status === "pending").length;

  return (
    <div className={className}>
      {/* Delete confirmation modal */}
      {pendingDelete && (
        <DeleteConfirmDialog
          filename={pendingDelete.filename}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{documents.length} source{documents.length !== 1 ? "s" : ""}</span>
          <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
            <AppIcon name="CheckCircle" className="h-3 w-3 mr-1" />
            {readyCount} ready
          </Badge>
          {processingCount > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              <AppIcon name="Loader" className="h-3 w-3 mr-1 animate-spin-slow" />
              {processingCount} processing
            </Badge>
          )}
          {failedDocs.length > 0 && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
              <AppIcon name="AlertCircle" className="h-3 w-3 mr-1" />
              {failedDocs.length} failed
            </Badge>
          )}
        </div>
      </div>

      {/* Failed banner — very visible */}
      {failedDocs.length > 0 && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AppIcon name="AlertTriangle" className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive mb-1">
                {failedDocs.length} document{failedDocs.length > 1 ? "s" : ""} failed to process
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                These documents are <strong>not available</strong> for chat. Your bot cannot answer questions from them until you retry or delete them.
              </p>
              {failedDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-destructive/20 first:border-t-0">
                  <span className="text-xs truncate text-foreground font-medium">{doc.filename}</span>
                  {onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onRetry(doc.id)}
                    >
                      <AppIcon name="RotateCcw" className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className={`transition-shadow hover:shadow-sm ${doc.status === "failed" ? "border-destructive/30 bg-destructive/5" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  doc.status === "failed"
                    ? "bg-destructive/10"
                    : doc.status === "ready"
                    ? "bg-green-500/10"
                    : "bg-muted"
                }`}>
                  <AppIcon
                    name={(FILE_TYPE_ICONS[doc.fileType] || "FileText") as any}
                    className={`h-4 w-4 ${
                      doc.status === "failed"
                        ? "text-destructive"
                        : doc.status === "ready"
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{doc.filename}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                      {doc.fileType.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                  </p>
                  {doc.status === "failed" && doc.errorMessage && (
                    <p className="text-xs text-destructive mt-1 line-clamp-2">{doc.errorMessage}</p>
                  )}
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={doc.status} />

                  {/* Inline retry for failed */}
                  {doc.status === "failed" && onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      onClick={() => onRetry(doc.id)}
                      title="Retry processing"
                    >
                      <AppIcon name="RotateCcw" className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* Delete */}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(doc)}
                      title="Delete document"
                    >
                      <AppIcon name="Trash2" className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
