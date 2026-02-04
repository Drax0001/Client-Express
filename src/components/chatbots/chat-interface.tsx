"use client"

import * as React from "react"
import {
  Send,
  Bot,
  User,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  FileText,
  ExternalLink,
  Download,
  Trash2,
  RotateCcw,
  MessageSquare,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
  tokensUsed?: number
  responseTime?: number
}

interface Source {
  id: string
  title: string
  url?: string
  snippet: string
  relevanceScore: number
}

interface ChatInterfaceProps {
  chatbotId: string
  chatbotName: string
  messages: Message[]
  isLoading?: boolean
  onSendMessage?: (message: string) => void
  onClearConversation?: () => void
  onExportConversation?: () => void
  onRateMessage?: (messageId: string, rating: 'positive' | 'negative') => void
  className?: string
}

export function ChatInterface({
  chatbotId,
  chatbotName,
  messages,
  isLoading = false,
  onSendMessage,
  onClearConversation,
  onExportConversation,
  onRateMessage,
  className,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  React.useEffect(() => {
    setIsTyping(isLoading)
  }, [isLoading])

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading) {
      onSendMessage?.(inputMessage.trim())
      setInputMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user'

    return (
      <div className={cn(
        "flex gap-3 group",
        isUser ? "justify-end" : "justify-start"
      )}>
        {!isUser && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarFallback className="bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "order-1" : "order-2"
        )}>
          <div className={cn(
            "rounded-lg px-4 py-3 shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted"
          )}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>

            {/* Message metadata */}
            <div className={cn(
              "flex items-center justify-between mt-2 text-xs opacity-70",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <span>{formatTimestamp(message.timestamp)}</span>
              {!isUser && message.tokensUsed && (
                <span>{message.tokensUsed} tokens</span>
              )}
              {!isUser && message.responseTime && (
                <span>{message.responseTime}ms</span>
              )}
            </div>
          </div>

          {/* Sources */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Sources ({message.sources.length})</span>
              </div>
              <div className="space-y-1">
                {message.sources.map((source, index) => (
                  <Card key={source.id} className="p-3 bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate"
                            >
                              {source.title}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-xs font-medium truncate">
                              {source.title}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {source.snippet}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(source.relevanceScore * 100)}% relevant
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Message actions */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content)}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-3 w-3" />
                <span className="sr-only">Copy message</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRateMessage?.(message.id, 'positive')}
                className="h-8 w-8 p-0"
              >
                <ThumbsUp className="h-3 w-3" />
                <span className="sr-only">Rate positive</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRateMessage?.(message.id, 'negative')}
                className="h-8 w-8 p-0"
              >
                <ThumbsDown className="h-3 w-3" />
                <span className="sr-only">Rate negative</span>
              </Button>
            </div>
          )}
        </div>

        {isUser && (
          <Avatar className="h-8 w-8 mt-1 order-2">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    )
  }

  const TypingIndicator = () => (
    <div className="flex gap-3 justify-start">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted rounded-lg px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">
            {chatbotName} is typing
          </span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{chatbotName}</h3>
            <p className="text-sm text-muted-foreground">
              Ask me anything about your documents
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Conversation options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportConversation}>
              <Download className="h-4 w-4 mr-2" />
              Export Conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearConversation}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                <p className="text-sm">
                  Ask {chatbotName} anything about your uploaded documents.
                  The responses are based solely on your content.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder={`Ask ${chatbotName} a question...`}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="min-h-[44px] max-h-[120px] resize-none pr-12"
                rows={1}
              />
              <div className="absolute right-3 bottom-3">
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-6 w-6 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              Press Enter to send, Shift+Enter for new line
            </span>
            <span>
              Responses are based on your uploaded documents only
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}