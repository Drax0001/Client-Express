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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  responseTime?: number;
}

export interface SuggestedMessage {
  label: string;
  prompt: string;
}

export interface ChatBranding {
  primaryColor?: string;
  userBubbleColor?: string;
  botBubbleColor?: string;
  userTextColor?: string;
  botTextColor?: string;
  headerColor?: string;
  logoUrl?: string;
  chatbotDisplayName?: string;
  welcomeMessage?: string;
  footerLinks?: { label: string; url: string }[];
}

interface ChatInterfaceProps {
  chatbotId: string;
  chatbotName: string;
  messages: Message[];
  isLoading?: boolean;
  branding?: ChatBranding | null;
  suggestedMessages?: SuggestedMessage[];
  modelName?: string;
  onSendMessage?: (message: string) => void;
  onStopGeneration?: () => void;
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
  suggestedMessages = [],
  modelName,
  onSendMessage,
  onStopGeneration,
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

  // Text-to-Speech (auto-detects language from text content)
  const tts = useTextToSpeech();

  const displayName = branding?.chatbotDisplayName || chatbotName;
  const welcome = branding?.welcomeMessage || `Hi! I'm ${displayName}. Ask me anything about your documents.`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    setIsTyping(isLoading);
  }, [isLoading]);

  const handleSendMessage = (content?: string) => {
    const msg = content || inputMessage.trim();
    if (msg && !isLoading) {
      onSendMessage?.(msg);
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

  const handleExportPdf = () => {
    if (onExportConversation) {
      onExportConversation();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${displayName} - Chat Export</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #020617; padding: 2rem; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 2rem; }
            .header h2 { margin: 0 0 0.5rem 0; color: #0f172a; }
            .message { margin-bottom: 1.5rem; display: flex; flex-direction: column; }
            .user-msg { align-items: flex-end; }
            .bot-msg { align-items: flex-start; }
            .bubble { max-width: 85%; padding: 1rem 1.25rem; border-radius: 1rem; font-size: 0.95rem; }
            .user-bubble { background-color: #0284c7; color: white; border-bottom-right-radius: 0.25rem; }
            .bot-bubble { background-color: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a; border-bottom-left-radius: 0.25rem; white-space: pre-wrap; }
            .meta { font-size: 0.75rem; color: #64748b; margin-top: 0.35rem; }
            @media print { 
              body { padding: 0; }
              .bubble { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${displayName} - Conversation Export</h2>
            <div class="meta">Exported on ${new Date().toLocaleString()}</div>
          </div>
          <div class="messages">
            ${messages.length === 0 ? '<p>No messages in this conversation.</p>' : ''}
            ${messages.map(msg => `
              <div class="message ${msg.role === 'user' ? 'user-msg' : 'bot-msg'}">
                <div class="bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}">
                  ${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}
                </div>
                <div class="meta">${msg.role === 'user' ? 'You' : displayName}</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
              }, 300);
            };
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  // Time formatter removed per user request

  // Resolve colors
  const userBubbleBg = branding?.userBubbleColor || undefined;
  const botBubbleBg = branding?.botBubbleColor || undefined;
  const userTextClr = branding?.userTextColor || undefined;
  const botTextClr = branding?.botTextColor || undefined;
  const headerBg = branding?.headerColor || undefined;

  // Suggested message pills
  const SuggestedPills = () => {
    if (suggestedMessages.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3 mb-1">
        {suggestedMessages.map((sm, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(sm.prompt)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border/60 bg-background hover:bg-muted/60 hover:border-border transition-all hover:scale-105 active:scale-95 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            style={branding?.primaryColor ? { borderColor: branding.primaryColor + "40", color: branding.primaryColor } : undefined}
          >
            <AppIcon name="Sparkles" className="h-3 w-3" />
            {sm.label}
          </button>
        ))}
      </div>
    );
  };

  const MessageBubble = ({ message, isLast }: { message: Message; isLast: boolean }) => {
    const isUser = message.role === "user";
    const msgRating = ratings[message.id];

    return (
      <>
        <div
          className={cn(
            "flex gap-3 group",
            isUser ? "justify-end" : "justify-start",
          )}
        >
          {!isUser && (
            <Avatar className="h-8 w-8 mt-1 shrink-0">
              {branding?.logoUrl ? (
                <AvatarImage src={branding.logoUrl} alt={displayName} className="object-contain p-0.5" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary">
                <AppIcon name="Bot" className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={cn(
              "max-w-[80%] space-y-1.5",
              isUser ? "order-1" : "order-2",
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-3 shadow-sm",
                isUser
                  ? "ml-auto rounded-br-md"
                  : "rounded-bl-md",
                !userBubbleBg && isUser && "bg-primary text-primary-foreground",
                !botBubbleBg && !isUser && "bg-muted",
              )}
              style={
                isUser && userBubbleBg
                  ? { backgroundColor: userBubbleBg, color: userTextClr || "#fff" }
                  : !isUser && botBubbleBg
                    ? { backgroundColor: botBubbleBg, color: botTextClr || (isLightColor(botBubbleBg) ? "#1e293b" : "#fff") }
                    : !isUser && botTextClr
                      ? { color: botTextClr }
                      : isUser && userTextClr
                        ? { color: userTextClr }
                        : undefined
              }
            >
              {isUser ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
              ) : (
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-black/5 dark:prose-pre:bg-white/5 prose-code:text-xs prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-black/5 dark:prose-code:bg-white/10 space-y-4 marker:text-current prose-headings:font-bold prose-h3:text-lg prose-h4:text-base prose-strong:font-bold prose-strong:text-current">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Bot message actions */}
            {!isUser && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(message.content)}
                  className="h-7 w-7 p-0"
                  title="Copy"
                >
                  <AppIcon name="Copy" className="h-3 w-3" />
                </Button>

                {tts.isSupported && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tts.speakMessage(message.id, message.content)}
                    className={cn(
                      "h-7 w-7 p-0",
                      tts.speakingMessageId === message.id && tts.isSpeaking && "text-primary bg-primary/10",
                    )}
                    title={tts.speakingMessageId === message.id && tts.isSpeaking ? "Stop reading" : "Read aloud"}
                  >
                    <AppIcon
                      name={tts.speakingMessageId === message.id && tts.isSpeaking ? "VolumeX" : "Volume2"}
                      className="h-3 w-3"
                    />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRate(message.id, "positive")}
                  className={cn("h-7 w-7 p-0", msgRating === "positive" && "text-green-500 bg-green-500/10")}
                  title="Good response"
                >
                  <AppIcon name="ThumbsUp" className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRate(message.id, "negative")}
                  className={cn("h-7 w-7 p-0", msgRating === "negative" && "text-red-500 bg-red-500/10")}
                  title="Bad response"
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
                  title="Copy"
                >
                  <AppIcon name="Copy" className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {isUser && (
            <Avatar className="h-8 w-8 mt-1 order-2 shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <AppIcon name="User" className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>

      </>
    );
  };

  const TypingIndicator = () => (
    <div className="flex gap-3 justify-start">
      <Avatar className="h-8 w-8 mt-1 shrink-0">
        {branding?.logoUrl ? (
          <AvatarImage src={branding.logoUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary">
          <AppIcon name="Bot" className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-sm" style={botBubbleBg ? { backgroundColor: botBubbleBg } : undefined}>
        <div className="flex items-center gap-1.5 h-5">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
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
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{displayName}</h3>
              {modelName && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {modelName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground" style={headerBg ? { color: isLightColor(headerBg) ? "#64748b" : "rgba(255,255,255,0.7)" } : undefined}>
              Online · Ready to help
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
            <DropdownMenuItem onClick={handleExportPdf}>
              <AppIcon name="Download" className="h-4 w-4 mr-2" />
              Export as PDF
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
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  {branding?.logoUrl ? (
                    <img src={branding.logoUrl} alt={displayName} className="h-10 w-10 object-contain rounded-xl" />
                  ) : (
                    <AppIcon name="MessageSquare" className="h-8 w-8 text-primary/60" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1 text-foreground">
                  {welcome}
                </h3>
                <p className="text-sm max-w-md mx-auto">
                  Type a message below or choose a suggested topic to get started.
                </p>
              </div>
              {/* Suggested messages after welcome */}
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                {suggestedMessages.map((sm, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sm.prompt)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border/60 bg-background hover:bg-muted/60 hover:border-border transition-all text-foreground shadow-sm disabled:opacity-50"
                    style={branding?.primaryColor ? { borderColor: branding.primaryColor + "40", color: branding.primaryColor } : undefined}
                  >
                    <AppIcon name="Sparkles" className="h-3.5 w-3.5" />
                    {sm.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={idx === messages.length - 1}
              />
            ))
          )}

          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t relative">
        <div className="max-w-4xl mx-auto">
          {/* Suggested Messages Above Input */}
          {messages.length > 0 && !isLoading && (
            <div className="mb-4">
              <SuggestedPills />
            </div>
          )}
          
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder={`Ask ${displayName} a question...`}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="min-h-[44px] max-h-[120px] resize-none pr-12 rounded-xl"
                rows={1}
              />
              <div className="absolute right-2 bottom-2">
                {isLoading ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onStopGeneration}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="Stop generating"
                  >
                    <AppIcon name="Square" className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim()}
                    className="h-8 w-8 p-0 rounded-lg"
                    style={branding?.primaryColor ? { backgroundColor: branding.primaryColor, borderColor: branding.primaryColor } : undefined}
                  >
                    <AppIcon name="Send" className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 text-xs text-muted-foreground gap-2">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {branding?.footerLinks && branding.footerLinks.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {branding.footerLinks.map((link: any, idx: number) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors hover:underline"
                    style={branding?.primaryColor ? { textDecorationColor: branding.primaryColor } : undefined}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
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
