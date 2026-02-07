"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FileUploadAreaProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FileUploadArea({
  onFileSelect,
  accept = ".pdf,.docx,.txt",
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  disabled = false,
  className,
}: FileUploadAreaProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFiles = (files: FileList): File[] => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxSize) {
        newErrors.push(
          `${file.name}: File size exceeds ${(maxSize / (1024 * 1024)).toFixed(1)}MB limit`,
        );
        return;
      }

      // Check file type
      const allowedExtensions = accept
        .split(",")
        .map((ext) => ext.trim().toLowerCase().replace(".", ""));
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        newErrors.push(`${file.name}: Invalid file type. Allowed: ${accept}`);
        return;
      }

      validFiles.push(file);
    });

    setErrors(newErrors);
    return validFiles;
  };

  const handleFileSelect = (files: FileList) => {
    const validFiles = validateFiles(files);
    setSelectedFiles(validFiles);
    onFileSelect(validFiles);
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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setErrors([]);
    onFileSelect([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver && !disabled
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-muted rounded-full">
            <AppIcon name="Upload" className="h-8 w-8 text-muted-foreground" />
          </div>

          <div>
            <p className="text-lg font-medium">
              {isDragOver ? "Drop files here" : "Upload documents"}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported: PDF, DOCX, TXT • Max {formatFileSize(maxSize)} each
            </p>
          </div>

          <Button type="button" variant="outline" disabled={disabled}>
            Choose Files
          </Button>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Selected Files ({selectedFiles.length})
            </h4>
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

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
              >
                <AppIcon
                  name="FileText"
                  className="h-4 w-4 text-muted-foreground flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <AppIcon name="X" className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive text-sm"
            >
              <AppIcon name="AlertCircle" className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
