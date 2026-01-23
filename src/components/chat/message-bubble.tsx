"use client";

import * as React from "react";
import { User, Bot, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isUser?: boolean;
  timestamp?: Date;
  sourceCount?: number;
  className?: string;
}

export function MessageBubble({
  content,
  isUser = false,
  timestamp,
  sourceCount,
  className,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex gap-3 max-w-4xl",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-medium hover-lift transition-all",
          isUser
            ? "bg-gradient-primary text-primary-foreground"
            : "bg-gradient-secondary text-secondary-foreground"
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-6 py-4 rounded-3xl break-words shadow-medium relative overflow-hidden max-w-[85%]",
            isUser
              ? "bg-gradient-primary text-primary-foreground rounded-br-xl shadow-strong"
              : "bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/30 text-card-foreground rounded-bl-xl glass"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>

        {/* Message Metadata */}
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground px-2",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {!isUser && sourceCount !== undefined && sourceCount > 0 && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              <Info className="h-3 w-3 mr-1" />
              {sourceCount} source{sourceCount !== 1 ? "s" : ""}
            </Badge>
          )}

          {timestamp && (
            <span>
              {timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
