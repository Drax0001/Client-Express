"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react";

interface Document {
  id: string;
  filename: string;
  fileType: "pdf" | "docx" | "txt" | "url";
  status: "pending" | "processing" | "ready" | "failed";
  uploadedAt: string;
  errorMessage?: string;
}

interface DocumentListProps {
  documents: Document[];
  onRetry?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  loading?: boolean;
  className?: string;
}

export function DocumentList({
  documents,
  onRetry,
  onDelete,
  loading = false,
  className,
}: DocumentListProps) {
  const formatFileSize = (filename: string) => {
    // This is a placeholder - in real app you'd get size from backend
    return "Unknown size";
  };

  const getFileIcon = (fileType: string) => {
    return <AppIcon name="FileText" className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AppIcon
            name="FileText"
            className="h-12 w-12 text-muted-foreground mb-4"
          />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Upload your first document to start building your knowledge base.
            Supported formats: PDF, DOCX, TXT, or URLs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          Documents ({documents.length})
        </h3>
        <div className="flex gap-2">
          <Badge variant="outline">
            {documents.filter((d) => d.status === "ready").length} Ready
          </Badge>
          <Badge variant="secondary">
            {documents.filter((d) => d.status === "processing").length}{" "}
            Processing
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {documents.map((document) => (
          <Card key={document.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getFileIcon(document.fileType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">
                      {document.filename}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {document.fileType.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Uploaded{" "}
                      {formatDistanceToNow(new Date(document.uploadedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {document.status === "ready" && (
                      <span>{formatFileSize(document.filename)}</span>
                    )}
                  </div>

                  {document.status === "failed" && document.errorMessage && (
                    <p className="text-sm text-destructive mt-1">
                      {document.errorMessage}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={document.status} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {document.status === "failed" && onRetry && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onRetry(document.id)}
                          >
                            <AppIcon
                              name="RotateCcw"
                              className="mr-2 h-4 w-4"
                            />
                            Retry processing
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(document.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <AppIcon name="Trash2" className="mr-2 h-4 w-4" />
                          Delete document
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
