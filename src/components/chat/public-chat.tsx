"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chatbots/chat-interface";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export function PublicChat({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (content: string) => {
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content,
            role: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const resp = await fetch(`/api/widget/${projectId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    conversationHistory: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data.error || "Failed to send message");
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-${Date.now()}`,
                    content: data.answer,
                    role: "assistant",
                    timestamp: new Date(),
                },
            ]);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    content: error.message || "An error occurred.",
                    role: "assistant",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ChatInterface
            chatbotId={projectId}
            chatbotName={projectName}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            className="h-full border-none rounded-none shadow-none"
        />
    );
}
