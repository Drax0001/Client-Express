"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ValidatedFile {
  id: string;
  file: File;
  status: "pending" | "validating" | "ready" | "error";
  validationErrors: string[];
  metadata: {
    name: string;
    size: number;
    type: string;
    detectedType?: string;
  };
}

interface FileUploadAreaProps {
  files: ValidatedFile[];
  onFilesChange: (files: ValidatedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

export function FileUploadArea({
  files,
  onFilesChange,
  maxFiles = 20,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className,
}: FileUploadAreaProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const supportedTypes = ["pdf", "docx", "txt", "md", "html", "csv", "json"];
  const supportedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/html",
    "text/csv",
    "application/json",
  ];

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <AppIcon name="FileText" className="h-4 w-4" />;
      case "docx":
        return <AppIcon name="FileText" className="h-4 w-4" />;
      default:
        return <AppIcon name="FileIcon" className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: ValidatedFile["status"]) => {
    switch (status) {
      case "ready":
        return (
          <AppIcon name="CheckCircle" className="h-4 w-4 text-green-500" />
        );
      case "error":
        return <AppIcon name="AlertCircle" className="h-4 w-4 text-red-500" />;
      case "validating":
        return (
          <div className="h-4 w-4 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: ValidatedFile["status"]) => {
    switch (status) {
      case "ready":
        return "border-success/20 bg-success/10";
      case "error":
        return "border-destructive/20 bg-destructive/10";
      case "validating":
        return "border-brand/20 bg-brand/5";
      default:
        return "border-border/60";
    }
  };

  const validateFile = (file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(
        `File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(maxFileSize)})`,
      );
    }

    // Check file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !supportedTypes.includes(fileExtension)) {
      errors.push(
        `File type not supported. Supported: ${supportedTypes.join(", ")}`,
      );
    }

    // Check MIME type
    if (!supportedMimeTypes.includes(file.type) && file.type !== "") {
      errors.push(`MIME type ${file.type} not supported`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileSelect = (fileList: FileList) => {
    const newFiles: ValidatedFile[] = [];

    Array.from(fileList).forEach((file) => {
      const validation = validateFile(file);
      const validatedFile: ValidatedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: validation.isValid ? "ready" : "error",
        validationErrors: validation.errors,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          detectedType: file.name.split(".").pop()?.toLowerCase(),
        },
      };
      newFiles.push(validatedFile);
    });

    // Check total file limit
    const totalFiles = [...files, ...newFiles];
    if (totalFiles.length > maxFiles) {
      // Keep only the first maxFiles files
      onFilesChange(totalFiles.slice(0, maxFiles));
    } else {
      onFilesChange([...files, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles);
    }
    // Reset input
    e.target.value = "";
  };

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  const clearAll = () => {
    onFilesChange([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const totalSize = files.reduce((sum, file) => sum + file.metadata.size, 0);
  const readyCount = files.filter((f) => f.status === "ready").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200",
          isDragOver && !disabled
            ? "border-brand bg-brand/5 scale-[1.02] shadow-[0_0_25px_rgba(var(--brand),0.2)]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer hover:bg-muted/20",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={supportedTypes.map((type) => `.${type}`).join(",")}
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-brand/10 border border-brand/20 rounded-full">
            <AppIcon name="Upload" className="h-6 w-6 text-brand" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragOver ? "Drop files here" : "Upload documents"}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to select
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span>Supported: {supportedTypes.join(", ")}</span>
              <span>•</span>
              <span>Max {maxFiles} files</span>
              <span>•</span>
              <span>Max {formatFileSize(maxFileSize)} each</span>
            </div>
          </div>

          <Button type="button" variant="outline" disabled={disabled}>
            Choose Files
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">
                Files ({files.length}/{maxFiles})
              </h4>
              {readyCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-success bg-success/10 border-success/20"
                >
                  {readyCount} ready
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} errors</Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                  getStatusColor(file.status),
                )}
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.metadata.name)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {file.metadata.name}
                    </p>
                    {getStatusIcon(file.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.metadata.size)}</span>
                    {file.metadata.detectedType && (
                      <>
                        <span>•</span>
                        <span>{file.metadata.detectedType.toUpperCase()}</span>
                      </>
                    )}
                  </div>
                  {file.validationErrors.length > 0 && (
                    <div className="space-y-1">
                      {file.validationErrors.map((error, index) => (
                        <p key={index} className="text-xs text-destructive">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <AppIcon name="X" className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
            <span>Total size: {formatFileSize(totalSize)}</span>
            <span>
              {readyCount} of {files.length} files ready
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
