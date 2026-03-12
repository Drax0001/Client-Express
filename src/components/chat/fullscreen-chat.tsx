"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatInterface, type ChatBranding, type SuggestedMessage } from "@/components/chatbots/chat-interface";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import { useSession } from "next-auth/react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    responseTime?: number;
}

interface ConversationItem {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    _count: { messages: number };
}

interface FullscreenChatProps {
    projectId: string;
    projectName: string;
    modules?: SuggestedMessage[] | null;
    branding?: ChatBranding | null;
    modelId?: string;
}

export function FullscreenChat({ projectId, projectName, modules, branding, modelId }: FullscreenChatProps) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const hasAutoCreated = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const suggestedMessages: SuggestedMessage[] = Array.isArray(modules) ? modules : [];
    const displayName = branding?.chatbotDisplayName || projectName;

    // Load conversations
    const loadConversations = useCallback(async () => {
        if (!session?.user) return;
        try {
            const res = await fetch(`/api/projects/${projectId}/conversations`);
            if (res.ok) setConversations(await res.json());
        } catch { }
    }, [projectId, session?.user]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Auto-create conversation
    const handleNewConversation = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "New Conversation" }),
            });
            if (res.ok) {
                const conv = await res.json();
                setActiveConvId(conv.id);
                setMessages([]);
                loadConversations();
            }
        } catch { }
    }, [projectId, loadConversations]);

    useEffect(() => {
        if (hasAutoCreated.current || !session?.user) return;
        hasAutoCreated.current = true;
        handleNewConversation();
    }, [session, handleNewConversation]);

    const handleSelectConversation = async (convId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/conversations/${convId}`);
            if (res.ok) {
                const data = await res.json();
                setActiveConvId(convId);
                setMessages(data.messages.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                })));
                setShowSidebar(false);
            }
        } catch { }
    };

    const handleRateMessage = async (messageId: string, rating: "positive" | "negative") => {
        if (!activeConvId) return;
        try {
            await fetch(`/api/projects/${projectId}/conversations/${activeConvId}/messages/${messageId}/rate`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating }),
            });
        } catch { }
    };

    const handleSendMessage = async (content: string) => {
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content,
            role: "user",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        // Auto-title after first message
        if (activeConvId && messages.length === 0) {
            const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
            fetch(`/api/projects/${projectId}/conversations/${activeConvId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            }).then(() => loadConversations()).catch(() => { });
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const startTime = performance.now();
            const endpoint = session?.user ? "/api/chat" : `/api/widget/${projectId}/chat`;
            const body = session?.user
                ? {
                    projectId,
                    message: content,
                    conversationId: activeConvId || undefined,
                    conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
                }
                : {
                    message: content,
                    conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
                };

            const resp = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify(body),
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to send message");

            const endTime = performance.now();
            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-${Date.now()}`,
                    content: data.answer,
                    role: "assistant",
                    timestamp: new Date(),
                    responseTime: Math.round(endTime - startTime),
                },
            ]);
        } catch (error: any) {
            if (error.name === "AbortError") return;
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
        <div className="w-full h-screen bg-background overflow-hidden flex">
            {/* Sidebar - only for authenticated users */}
            {session?.user && showSidebar && (
                <div className="w-60 shrink-0 border-r border-border/60 bg-card flex flex-col absolute inset-y-0 left-0 z-20 shadow-lg">
                    <div className="p-3 border-b border-border/60 flex items-center gap-2">
                        {branding?.logoUrl && (
                            <img src={branding.logoUrl} alt={displayName} className="w-7 h-7 rounded object-contain" />
                        )}
                        <span className="font-semibold text-sm truncate flex-1">{displayName}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setShowSidebar(false)}>
                            <AppIcon name="X" className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="p-3 border-b border-border/60">
                        <Button
                            size="sm"
                            className="w-full bg-brand hover:bg-brand-hover text-white"
                            onClick={() => {
                                setActiveConvId(null);
                                setMessages([]);
                                hasAutoCreated.current = false;
                                handleNewConversation();
                                setShowSidebar(false);
                            }}
                        >
                            <AppIcon name="Plus" className="h-4 w-4 mr-1" />
                            New Conversation
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <p className="p-3 text-xs text-muted-foreground text-center">No conversations yet</p>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => handleSelectConversation(conv.id)}
                                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/30 hover:bg-muted/50 transition-colors ${activeConvId === conv.id ? "bg-brand/10 text-brand" : "text-foreground"}`}
                                >
                                    <p className="font-medium truncate text-xs">{conv.title || "Untitled"}</p>
                                    <p className="text-[10px] text-muted-foreground">{conv._count.messages} msgs</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Main chat - takes full width, sidebar is overlaid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <ChatInterface
                    chatbotId={projectId}
                    chatbotName={projectName}
                    messages={messages}
                    isLoading={isLoading}
                    branding={branding}
                    suggestedMessages={suggestedMessages}
                    modelName={modelId}
                    onSendMessage={handleSendMessage}
                    onRateMessage={handleRateMessage}
                    onClearConversation={() => {
                        setMessages([]);
                        hasAutoCreated.current = false;
                        handleNewConversation();
                    }}
                    onStopGeneration={() => abortControllerRef.current?.abort()}
                    className="h-full border-none rounded-none shadow-none"
                />

                {/* Floating sidebar toggle — only for authenticated users */}
                {session?.user && (
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="absolute top-3 left-3 z-10 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title="Toggle conversations"
                    >
                        <AppIcon name="PanelLeft" className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
