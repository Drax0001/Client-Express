"use client"

import * as React from "react"
import { Link, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface UrlUploadInputProps {
  onUrlSubmit: (url: string) => void
  disabled?: boolean
  className?: string
}

export function UrlUploadInput({
  onUrlSubmit,
  disabled = false,
  className,
}: UrlUploadInputProps) {
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState("")
  const [isValidating, setIsValidating] = React.useState(false)

  const validateUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError("URL is required")
      return
    }

    if (!validateUrl(url.trim())) {
      setError("Please enter a valid HTTP or HTTPS URL")
      return
    }

    setError("")
    setIsValidating(true)

    // Simulate URL validation (could be a HEAD request)
    setTimeout(() => {
      setIsValidating(false)
      onUrlSubmit(url.trim())
      setUrl("")
    }, 500)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    if (error) setError("")
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="url-input">Document URL</Label>
        <p className="text-sm text-muted-foreground">
          Enter a URL to a document you want to add to your knowledge base
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Link className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com/document.pdf"
            value={url}
            onChange={handleUrlChange}
            disabled={disabled || isValidating}
            className={cn(
              "pl-10",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        </div>
        <Button
          type="submit"
          disabled={disabled || isValidating || !url.trim()}
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
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Supported formats: PDF, DOCX, TXT files accessible via HTTP/HTTPS</p>
        <p>The document will be downloaded and processed for your knowledge base</p>
      </div>
    </div>
  )
}