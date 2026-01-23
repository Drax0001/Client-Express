"use client"

import * as React from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Ask a question about your documents...",
  className,
}: MessageInputProps) {
  const [message, setMessage] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedMessage = message.trim()
    if (!trimmedMessage || disabled) return

    onSend(trimmedMessage)
    setMessage("")

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Announce character count for screen readers (if we add a limit later)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (error) setError("")
  }

  const canSend = message.trim().length > 0 && !disabled

  return (
    <div className={cn("border-t border-border/50 bg-gradient-to-t from-background to-background/95 backdrop-blur-sm p-4 sm:p-6", className)}>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-accent opacity-5 rounded-2xl blur-sm"></div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "relative w-full resize-none rounded-2xl border border-border/30 bg-gradient-to-br from-background via-background/95 to-background/90 px-5 py-4 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30",
              "disabled:cursor-not-allowed disabled:opacity-50 shadow-soft hover:shadow-medium transition-all",
              "max-h-32 overflow-y-auto custom-scrollbar",
              // Mobile optimizations
              "touch-manipulation"
            )}
            style={{ minHeight: '52px' }}
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={!canSend}
          className="h-13 w-13 p-0 flex-shrink-0 bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-medium hover:shadow-strong hover-lift transition-all rounded-2xl touch-manipulation"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>

      <div className="text-xs text-muted-foreground text-center mt-2 hidden sm:block">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}