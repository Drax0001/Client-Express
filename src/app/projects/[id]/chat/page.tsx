"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ChatInterface, type SuggestedMessage, type ChatBranding } from "@/components/chatbots/chat-interface";
import { useProject, useSendChatMessage } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  responseTime?: number;
}

interface ConversationItem {
  id: string;
  title: string;
  module: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { toast } = useToast();
  const { t } = useTranslation();
  const sendMessageMutation = useSendChatMessage();

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoCreated = useRef(false);

  const parsedSuggestedMessages: SuggestedMessage[] = Array.isArray(project?.modules)
    ? (project.modules as SuggestedMessage[])
    : [];

  const chatBranding: ChatBranding | null = project?.branding ? (project.branding as ChatBranding) : null;

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`);
      if (res.ok) setConversations(await res.json());
    } catch { }
  }, [projectId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Set up a new conversation (without saving empty conversation to DB)
  const handleNewConversation = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
  }, []);

  // Initialize a blank conversation on load if none active
  useEffect(() => {
    if (hasAutoCreated.current || !project || projectLoading) return;
    hasAutoCreated.current = true;
    handleNewConversation();
  }, [project, projectLoading, handleNewConversation]);

  const handleDeleteConversation = async (convId: string) => {
    // Optimistic UI update
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) handleNewConversation();

    try {
      const res = await fetch(`/api/projects/${projectId}/conversations/${convId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete");
      }
    } catch {
      toast({ title: t("workspace.deleteError"), variant: "destructive" });
      loadConversations();
    }
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

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isTyping || !project) return;
    
    if (project.documentCount === 0) {
      toast({
        title: t("chat.emptyKB"),
        description: t("chat.emptyKBDesc"),
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, content, role: "user", timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    let currentConvId = activeConvId;

    try {
      if (!currentConvId) {
        const res = await fetch(`/api/projects/${projectId}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.substring(0, 50) + (content.length > 50 ? "..." : "") }),
        });
        if (res.ok) {
          const conv = await res.json();
          currentConvId = conv.id;
          setActiveConvId(conv.id);
        }
      } else if (messages.length === 0) {
        autoTitleConversation(currentConvId, content);
      }

      const startTime = performance.now();
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await sendMessageMutation.mutateAsync({
        projectId,
        message: content,
        conversationId: currentConvId || undefined,
        conversationHistory,
      });

      const endTime = performance.now();

      const assistantMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        content: response.answer,
        role: "assistant",
        timestamp: new Date(),
        responseTime: Math.round(endTime - startTime),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      loadConversations();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          content: err?.error?.message || "Sorry, something went wrong. Please try again.",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    hasAutoCreated.current = false;
    handleNewConversation();
    toast({ title: t("chat.cleared") });
  };

  if (projectLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="loader-creative" aria-label={t("chat.loading")}></div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">{t("workspace.projectNotFound")}</p>
        <Button asChild variant="outline">
          <Link href="/projects">
            <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
            {t("workspace.backToDashboard")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Slim top bar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover-lift" asChild>
          <Link href={`/projects/${projectId}`}>
            <AppIcon name="ArrowLeft" className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-brand/10 text-brand flex items-center justify-center overflow-hidden border border-brand/20">
            {chatBranding?.logoUrl ? (
              <img src={chatBranding.logoUrl as string} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <AppIcon name="Bot" className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">{project.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hidden sm:flex text-muted-foreground hover:text-foreground hover-lift"
            asChild
          >
            <Link href={`/projects/${projectId}`}>
              <AppIcon name="Settings" className="h-3.5 w-3.5 mr-1" />
              {t("common.manage")}
            </Link>
          </Button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Conversation Sidebar */}
        <div className="w-64 border-r border-border/60 bg-muted/30 flex-col hidden md:flex shrink-0">
          <div className="p-3">
            <Button
              size="sm"
              className="w-full bg-brand hover:bg-brand-hover text-white shadow-soft transition-all"
              onClick={handleNewConversation}
            >
              <AppIcon name="Plus" className="h-4 w-4 mr-1.5" />
              {t("conversations.new")}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-xs text-muted-foreground text-center animate-in fade-in duration-500">
                {t("conversations.empty")}
              </p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`group relative flex items-center rounded-lg transition-all border ${
                    activeConvId === conv.id 
                      ? "bg-background border-border/80 shadow-sm" 
                      : "border-transparent hover:bg-background/50"
                  }`}
                >
                  <button
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`flex-1 text-left px-3 py-2.5 min-w-0 ${activeConvId === conv.id ? "text-brand" : "text-foreground"}`}
                  >
                    <p className="font-medium truncate text-xs">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {conv._count.messages} msgs · {activeConvId === conv.id ? "Viewing" : new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if(confirm(t("chat.deleteConfirm"))) handleDeleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-2 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    title={t("common.delete")}
                  >
                    <AppIcon name="Trash2" className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-w-0 bg-card relative">
          {project.documentCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-brand/10 opacity-80 rounded-full blur-2xl transform scale-150"></div>
                <div className="w-16 h-16 rounded-2xl bg-muted border border-border/50 flex items-center justify-center relative shadow-soft">
                  <AppIcon name="Database" className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-xl font-semibold tracking-tight mt-2">{t("chat.noDocs")}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("chat.noDocsDesc")}
              </p>
              <Button asChild className="mt-2 hover-lift">
                <Link href={`/projects/${projectId}`}>
                  <AppIcon name="Plus" className="mr-2 h-4 w-4" />
                  {t("chat.addDocs")}
                </Link>
              </Button>
            </div>
          ) : (
            <ChatInterface
              chatbotId={projectId}
              chatbotName={project.name}
              messages={messages}
              isLoading={isTyping}
              branding={chatBranding as any}
              suggestedMessages={parsedSuggestedMessages}
              modelName={undefined}
              onSendMessage={handleSendMessage}
              onClearConversation={handleClearConversation}
              onRateMessage={handleRateMessage}
              onStopGeneration={() => abortControllerRef.current?.abort()}
              className="h-full border-0 rounded-none shadow-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
