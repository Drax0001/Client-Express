"use client";

import * as React from "react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { MessageInput } from "./message-input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  sourceCount?: number;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isTyping = false,
  disabled = false,
  className,
}: ChatInterfaceProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = (content: string) => {
    onSendMessage(content);
  };

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Messages Area */}
      <ScrollArea
        className="flex-1 p-4"
        ref={scrollAreaRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div
              className="text-center py-12"
              role="status"
              aria-label="Empty chat"
            >
              <div className="text-6xl mb-4" aria-hidden="true">
                💬
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Start a conversation
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ask questions about your uploaded documents. The AI will answer
                based only on the content you've provided.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
                sourceCount={message.sourceCount}
              />
            ))
          )}

          {isTyping && (
            <div role="status" aria-label="AI is typing">
              <TypingIndicator />
            </div>
          )}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={disabled || isTyping}
        placeholder={
          messages.length === 0
            ? "Ask your first question..."
            : "Ask a follow-up question..."
        }
      />
    </div>
  );
}
