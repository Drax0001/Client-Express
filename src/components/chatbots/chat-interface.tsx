"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  responseTime?: number;
}

export interface ChatBranding {
  primaryColor?: string;
  userBubbleColor?: string;
  botBubbleColor?: string;
  headerColor?: string;
  logoUrl?: string;
  chatbotDisplayName?: string;
  welcomeMessage?: string;
}

interface ChatInterfaceProps {
  chatbotId: string;
  chatbotName: string;
  messages: Message[];
  isLoading?: boolean;
  branding?: ChatBranding | null;
  onSendMessage?: (message: string) => void;
  onClearConversation?: () => void;
  onExportConversation?: () => void;
  onRateMessage?: (messageId: string, rating: "positive" | "negative") => void;
  className?: string;
}

export function ChatInterface({
  chatbotId,
  chatbotName,
  messages,
  isLoading = false,
  branding,
  onSendMessage,
  onClearConversation,
  onExportConversation,
  onRateMessage,
  className,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [ratings, setRatings] = React.useState<Record<string, "positive" | "negative">>({});
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const displayName = branding?.chatbotDisplayName || chatbotName;
  const welcome = branding?.welcomeMessage || `Ask ${displayName} anything about your documents`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    setIsTyping(isLoading);
  }, [isLoading]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading) {
      onSendMessage?.(inputMessage.trim());
      setInputMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleRate = (messageId: string, rating: "positive" | "negative") => {
    const currentRating = ratings[messageId];
    if (currentRating === rating) {
      // Toggle off
      setRatings(prev => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    } else {
      setRatings(prev => ({ ...prev, [messageId]: rating }));
      onRateMessage?.(messageId, rating);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Resolve colors
  const userBubbleBg = branding?.userBubbleColor || undefined;
  const botBubbleBg = branding?.botBubbleColor || undefined;
  const headerBg = branding?.headerColor || undefined;

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";
    const msgRating = ratings[message.id];

    return (
      <div
        className={cn(
          "flex gap-3 group",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        {!isUser && (
          <Avatar className="h-8 w-8 mt-1">
            {branding?.logoUrl ? (
              <AvatarImage src={branding.logoUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              <AppIcon name="Bot" className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={cn(
            "max-w-[80%] space-y-2",
            isUser ? "order-1" : "order-2",
          )}
        >
          <div
            className={cn(
              "rounded-lg px-4 py-3 shadow-sm",
              isUser
                ? "ml-auto"
                : "prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-pre:p-0",
              !userBubbleBg && isUser && "bg-primary text-primary-foreground",
              !botBubbleBg && !isUser && "bg-muted",
            )}
            style={isUser && userBubbleBg ? { backgroundColor: userBubbleBg, color: "#fff" } : !isUser && botBubbleBg ? { backgroundColor: botBubbleBg, color: isLightColor(botBubbleBg) ? "#1e293b" : "#fff" } : undefined}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {isUser ? (
                message.content
              ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              )}
            </div>

            {/* Metadata */}
            <div
              className={cn(
                "flex items-center justify-between mt-2 text-xs opacity-70",
                isUser ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
              style={isUser && userBubbleBg ? { color: "rgba(255,255,255,0.7)" } : undefined}
            >
              <span>{formatTimestamp(message.timestamp)}</span>
              {!isUser && message.responseTime && (
                <span>{message.responseTime}ms</span>
              )}
            </div>
          </div>

          {/* Bot message actions */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content)}
                className="h-7 w-7 p-0"
              >
                <AppIcon name="Copy" className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRate(message.id, "positive")}
                className={cn("h-7 w-7 p-0", msgRating === "positive" && "text-green-500 bg-green-500/10")}
              >
                <AppIcon name="ThumbsUp" className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRate(message.id, "negative")}
                className={cn("h-7 w-7 p-0", msgRating === "negative" && "text-red-500 bg-red-500/10")}
              >
                <AppIcon name="ThumbsDown" className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* User message actions */}
          {isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content)}
                className="h-7 w-7 p-0"
              >
                <AppIcon name="Copy" className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {isUser && (
          <Avatar className="h-8 w-8 mt-1 order-2">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <AppIcon name="User" className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex gap-3 justify-start">
      <Avatar className="h-8 w-8 mt-1">
        {branding?.logoUrl ? (
          <AvatarImage src={branding.logoUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary">
          <AppIcon name="Bot" className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted rounded-lg px-4 py-3 shadow-sm" style={botBubbleBg ? { backgroundColor: botBubbleBg } : undefined}>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">
            {displayName} is typing
          </span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={headerBg ? { backgroundColor: headerBg, color: isLightColor(headerBg) ? "#1e293b" : "#fff" } : undefined}>
        <div className="flex items-center gap-3">
          <Avatar>
            {branding?.logoUrl ? (
              <AvatarImage src={branding.logoUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              <AppIcon name="Bot" className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground" style={headerBg ? { color: isLightColor(headerBg) ? "#64748b" : "rgba(255,255,255,0.7)" } : undefined}>
              {welcome}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <AppIcon name="MoreHorizontal" className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportConversation}>
              <AppIcon name="Download" className="h-4 w-4 mr-2" />
              Export Conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearConversation}>
              <AppIcon name="Trash2" className="h-4 w-4 mr-2" />
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
                <AppIcon name="MessageSquare" className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm">
                  {welcome}
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
                placeholder={`Ask ${displayName} a question...`}
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
                  style={branding?.primaryColor ? { backgroundColor: branding.primaryColor, borderColor: branding.primaryColor } : undefined}
                >
                  {isLoading ? (
                    <AppIcon name="Loader2" className="h-3 w-3 animate-spin" />
                  ) : (
                    <AppIcon name="Send" className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Responses are based on your uploaded documents only</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helper: returns true if a hex color is light (for readable text contrast) */
function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
