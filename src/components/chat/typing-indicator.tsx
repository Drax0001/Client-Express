"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={`flex gap-3 max-w-4xl mr-auto ${className || ""}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
        <AppIcon name="Bot" className="h-4 w-4" />
      </div>

      {/* Typing Animation */}
      <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Thinking</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
