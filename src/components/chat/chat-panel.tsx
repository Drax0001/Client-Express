import React from "react";
import { ChatInterface } from "@/components/chatbots/chat-interface";
import type { ChatBranding } from "@/components/chatbots/chat-interface";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responseTime?: number;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (m: string) => void;
  isTyping?: boolean;
  disabled?: boolean;
  branding?: ChatBranding | null;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isTyping,
  disabled,
  branding,
}: ChatPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <ChatInterface
          chatbotId=""
          chatbotName=""
          messages={messages.map(m => ({
            ...m,
            role: m.role,
          }))}
          onSendMessage={onSendMessage}
          isLoading={isTyping}
          branding={branding}
        />
      </div>
    </div>
  );
}
