"use client";

import { useState, useEffect, useRef } from "react";
import { ChatInterface, type ChatBranding } from "@/components/chatbots/chat-interface";
import { ModuleSelector, type Module } from "@/components/chatbots/module-selector";
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
    module: string | null;
    status: string;
    createdAt: string;
    _count: { messages: number };
}

interface FullscreenChatProps {
    projectId: string;
    projectName: string;
    modules?: Module[] | null;
    branding?: ChatBranding | null;
}

export function FullscreenChat({ projectId, projectName, modules, branding }: FullscreenChatProps) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const hasAutoCreated = useRef(false);

    const projectModules: Module[] = Array.isArray(modules) ? modules : [];
    const displayName = branding?.chatbotDisplayName || projectName;

    // Load conversations
    const loadConversations = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/conversations`);
            if (res.ok) setConversations(await res.json());
        } catch { }
    };

    useEffect(() => {
        if (session?.user) loadConversations();
    }, [projectId, session]);

    // Auto-create conversation
    useEffect(() => {
        if (hasAutoCreated.current || !session?.user) return;
        if (projectModules.length === 0 && !activeConvId) {
            hasAutoCreated.current = true;
            handleNewConversation();
        }
    }, [session]);

    const handleNewConversation = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: selectedModule?.name || "New Conversation",
                    module: selectedModule?.name,
                }),
            });
            if (res.ok) {
                const conv = await res.json();
                setActiveConvId(conv.id);
                setMessages([]);
                loadConversations();
            }
        } catch { }
    };

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
            }
        } catch { }
    };

    const autoTitleConversation = async (convId: string, firstMessage: string) => {
        const title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + "..." : firstMessage;
        try {
            await fetch(`/api/projects/${projectId}/conversations/${convId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            loadConversations();
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
            autoTitleConversation(activeConvId, content);
        }

        try {
            const startTime = performance.now();
            // Use widget endpoint for public, or chat endpoint if authenticated
            const endpoint = session?.user
                ? "/api/chat"
                : `/api/widget/${projectId}/chat`;
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
                <div className="w-60 shrink-0 border-r border-border/60 bg-card flex flex-col">
                    <div className="p-3 border-b border-border/60 flex items-center gap-2">
                        {branding?.logoUrl && (
                            <img src={branding.logoUrl} alt={displayName} className="w-7 h-7 rounded object-contain" />
                        )}
                        <span className="font-semibold text-sm truncate">{displayName}</span>
                    </div>
                    <div className="p-3 border-b border-border/60">
                        <Button
                            size="sm"
                            className="w-full bg-brand hover:bg-brand-hover text-white"
                            onClick={() => {
                                setSelectedModule(null);
                                setActiveConvId(null);
                                setMessages([]);
                                if (projectModules.length === 0) {
                                    handleNewConversation();
                                }
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

            {/* Main chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toggle sidebar button */}
                {session?.user && (
                    <div className="absolute top-2 left-2 z-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="h-8 w-8 p-0"
                        >
                            <AppIcon name={showSidebar ? "PanelLeftClose" : "PanelLeft"} className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Module selector or Chat */}
                {!activeConvId && projectModules.length > 0 ? (
                    <ModuleSelector
                        modules={projectModules}
                        onSelect={(mod) => {
                            setSelectedModule(mod);
                            handleNewConversation();
                        }}
                        className="flex-1"
                    />
                ) : (
                    <ChatInterface
                        chatbotId={projectId}
                        chatbotName={projectName}
                        messages={messages}
                        isLoading={isLoading}
                        branding={branding}
                        onSendMessage={handleSendMessage}
                        onRateMessage={handleRateMessage}
                        className="h-full border-none rounded-none shadow-none"
                    />
                )}
            </div>
        </div>
    );
}
