import React from "react";
import { ChatInterface, Message } from "./chat-interface";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (m: string) => void;
  isTyping?: boolean;
  disabled?: boolean;
}

export type { Message } from "./chat-interface";

export function ChatPanel({
  messages,
  onSendMessage,
  isTyping,
  disabled,
}: ChatPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={onSendMessage}
          isTyping={isTyping}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
