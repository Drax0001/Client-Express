"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type UploadStatus = "uploading" | "processing" | "completed" | "failed";

interface DocumentUploadProgressProps {
  fileName: string;
  status: UploadStatus;
  progress?: number; // 0-100 for uploading
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function DocumentUploadProgress({
  fileName,
  status,
  progress = 0,
  error,
  onRetry,
  onCancel,
  className,
}: DocumentUploadProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return (
          <AppIcon
            name="Loader2"
            className="h-4 w-4 animate-spin text-blue-500"
          />
        );
      case "processing":
        return (
          <AppIcon
            name="Sparkles"
            className="h-4 w-4 text-yellow-500"
          />
        );
      case "completed":
        return (
          <AppIcon name="CheckCircle" className="h-4 w-4 text-green-500" />
        );
      case "failed":
        return <AppIcon name="XCircle" className="h-4 w-4 text-red-500" />;
      default:
        return (
          <AppIcon name="FileText" className="h-4 w-4 text-muted-foreground" />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return `Uploading... ${Math.round(progress)}%`;
      case "processing":
        return `Processing... ${Math.round(progress)}%`;
      case "completed":
        return "Upload completed";
      case "failed":
        return "Upload failed";
      default:
        return "Unknown status";
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Ready
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "uploading":
        return <Badge variant="outline">Uploading</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("p-4 border rounded-lg bg-card", className)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium truncate">{fileName}</h4>
            {getStatusBadge()}
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            {getStatusText()}
          </p>

          {/* Progress bar for uploading/processing */}
          {(status === "uploading" || status === "processing") && (
            <Progress value={progress} className="h-2 mb-2" />
          )}

          {/* Error message */}
          {status === "failed" && error && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              <AppIcon
                name="AlertCircle"
                className="h-3 w-3 flex-shrink-0 mt-0.5"
              />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex gap-1">
          {status === "failed" && onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 px-2 text-xs"
            >
              Retry
            </Button>
          )}

          {(status === "uploading" || status === "processing") && onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 px-2 text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
