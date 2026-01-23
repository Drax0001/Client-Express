"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
}

export function UploadProgress({
  fileName,
  progress,
  status,
  error,
}: UploadProgressProps) {
  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return `Uploading... ${Math.round(progress)}%`;
      case "processing":
        return "Processing document...";
      case "completed":
        return "Upload completed";
      case "error":
        return `Upload failed: ${error}`;
      default:
        return "Unknown status";
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <span className="text-xs text-muted-foreground">
              {getStatusText()}
            </span>
          </div>

          {status !== "error" && <Progress value={progress} className="h-2" />}

          {status === "error" && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
