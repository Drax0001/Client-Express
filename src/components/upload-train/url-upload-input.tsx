"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ValidatedUrl {
  id: string;
  url: string;
  status: "pending" | "validating" | "ready" | "error";
  validationErrors: string[];
  metadata?: {
    title?: string;
    contentType?: string;
    size?: number;
    lastModified?: string;
  };
}

interface UrlUploadInputProps {
  urls: ValidatedUrl[];
  onUrlsChange: (urls: ValidatedUrl[]) => void;
  maxUrls?: number;
  disabled?: boolean;
  className?: string;
}

export function UrlUploadInput({
  urls,
  onUrlsChange,
  maxUrls = 10,
  disabled = false,
  className,
}: UrlUploadInputProps) {
  const [currentUrl, setCurrentUrl] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);
  const [error, setError] = React.useState("");

  const validateUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const fetchUrlMetadata = async (
    url: string,
  ): Promise<{ title?: string; contentType?: string; size?: number }> => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type") || undefined;
      const contentLength = response.headers.get("content-length");
      const size = contentLength ? parseInt(contentLength) : undefined;

      return { contentType, size };
    } catch {
      // If HEAD fails, try GET with limited range
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Range: "bytes=0-1023" }, // Just get first 1KB
        });
        const contentType = response.headers.get("content-type") || undefined;
        return { contentType };
      } catch {
        return {};
      }
    }
  };

  const addUrl = async () => {
    const trimmedUrl = currentUrl.trim();

    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setError("Please enter a valid HTTP or HTTPS URL");
      return;
    }

    if (urls.length >= maxUrls) {
      setError(`Maximum ${maxUrls} URLs allowed`);
      return;
    }

    if (urls.some((u) => u.url === trimmedUrl)) {
      setError("This URL has already been added");
      return;
    }

    setError("");
    setIsValidating(true);

    try {
      // Create validating entry
      const validatingUrl: ValidatedUrl = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: trimmedUrl,
        status: "validating",
        validationErrors: [],
      };

      onUrlsChange([...urls, validatingUrl]);

      // Fetch metadata
      const metadata = await fetchUrlMetadata(trimmedUrl);

      // Validate content type if available
      const errors: string[] = [];
      if (metadata.contentType) {
        const supportedTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
          "text/html",
        ];
        if (
          !supportedTypes.some((type) => metadata.contentType?.includes(type))
        ) {
          errors.push(
            `Content type ${metadata.contentType} may not be supported`,
          );
        }
      }

      // Update URL with validation results
      const updatedUrls = urls.map((u) =>
        u.id === validatingUrl.id
          ? {
              ...u,
              status: errors.length === 0 ? "ready" : "error",
              validationErrors: errors,
              metadata,
            }
          : u,
      );

      onUrlsChange([
        ...updatedUrls,
        {
          ...validatingUrl,
          status: errors.length === 0 ? "ready" : "error",
          validationErrors: errors,
          metadata,
        },
      ]);
    } catch (fetchError) {
      // Update with error status
      const updatedUrls = urls.map((u) =>
        u.id === validatingUrl.id
          ? {
              ...u,
              status: "error",
              validationErrors: [
                "Failed to validate URL - may be inaccessible",
              ],
            }
          : u,
      );

      onUrlsChange(updatedUrls);
    }

    setCurrentUrl("");
    setIsValidating(false);
  };

  const removeUrl = (urlId: string) => {
    onUrlsChange(urls.filter((u) => u.id !== urlId));
  };

  const clearAll = () => {
    onUrlsChange([]);
  };

  const getStatusIcon = (status: ValidatedUrl["status"]) => {
    switch (status) {
      case "ready":
        return (
          <AppIcon name="CheckCircle" className="h-4 w-4 text-green-500" />
        );
      case "error":
        return <AppIcon name="AlertCircle" className="h-4 w-4 text-red-500" />;
      case "validating":
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: ValidatedUrl["status"]) => {
    switch (status) {
      case "ready":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "validating":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200";
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const readyCount = urls.filter((u) => u.status === "ready").length;
  const errorCount = urls.filter((u) => u.status === "error").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="url-input">Document URLs</Label>
        <p className="text-sm text-muted-foreground">
          Add URLs to documents you want to include in your knowledge base
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <AppIcon name="Globe" className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com/document.pdf"
            value={currentUrl}
            onChange={(e) => {
              setCurrentUrl(e.target.value);
              if (error) setError("");
            }}
            disabled={disabled || isValidating}
            className={cn(
              "pl-10",
              error && "border-destructive focus-visible:ring-destructive",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={addUrl}
          disabled={
            disabled ||
            isValidating ||
            !currentUrl.trim() ||
            urls.length >= maxUrls
          }
        >
          {isValidating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Adding...
            </>
          ) : (
            "Add URL"
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* URL List */}
      {urls.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">
                URLs ({urls.length}/{maxUrls})
              </h4>
              {readyCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-green-700 bg-green-100"
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
            {urls.map((url) => (
              <div
                key={url.id}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                  getStatusColor(url.status),
                )}
              >
                <div className="flex-shrink-0">
                  <AppIcon
                    name="Link"
                    className="h-4 w-4 text-muted-foreground"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate flex items-center gap-1"
                    >
                      {url.url}
                      <AppIcon
                        name="ExternalLink"
                        className="h-3 w-3 flex-shrink-0"
                      />
                    </a>
                    {getStatusIcon(url.status)}
                  </div>

                  {url.metadata && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {url.metadata.contentType && (
                        <span>{url.metadata.contentType}</span>
                      )}
                      {url.metadata.size && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(url.metadata.size)}</span>
                        </>
                      )}
                    </div>
                  )}

                  {url.validationErrors.length > 0 && (
                    <div className="space-y-1">
                      {url.validationErrors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600">
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
                  onClick={() => removeUrl(url.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <AppIcon name="X" className="h-4 w-4" />
                  <span className="sr-only">Remove URL</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          Supported formats: PDF, DOCX, TXT, HTML, Markdown files accessible via
          HTTP/HTTPS
        </p>
        <p>
          URLs will be validated and documents will be downloaded during
          training
        </p>
      </div>
    </div>
  );
}
