"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ChatInterface, ChatBranding, SuggestedMessage } from "@/components/chatbots/chat-interface";
import { useSendChatMessage, useUsage } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { UpgradeModal } from "@/components/projects/upgrade-modal";

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

interface ChatTabProps {
  projectId: string;
  project: any;
  hasDocuments: boolean;
  onNavigateToSources: () => void;
}

export function ChatTab({ projectId, project, hasDocuments, onNavigateToSources }: ChatTabProps) {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const sendMessageMutation = useSendChatMessage();
  const { data: usageData } = useUsage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoCreated = useRef(false);

  const parsedSuggestedMessages: SuggestedMessage[] = Array.isArray(project?.modules) ? (project.modules as SuggestedMessage[]) : [];
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

  useEffect(() => {
    if (hasAutoCreated.current || !project) return;
    hasAutoCreated.current = true;
    handleNewConversation();
  }, [project, handleNewConversation]);

  const handleDeleteConversation = async (convId: string) => {
    // Optimistic UI update
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) handleNewConversation();

    try {
      const res = await fetch(`/api/projects/${projectId}/conversations/${convId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete");
      }
      toast({ title: t("conversations.deleteSuccess") });
    } catch {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
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
    if (!hasDocuments) {
      toast({
        title: t("chat.emptyKB"),
        description: t("chat.emptyKBDesc"),
        variant: "destructive",
      });
      onNavigateToSources();
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
      
      // Check for limit reached
      if (err?.status === 403 || err?.error?.message === "Plan Limit Exceeded" || err?.error?.details?.includes("reach")) {
        setShowUpgradeModal(true);
        // Remove the user's optimistic message since it wasn't processed
        setMessages((prev) => prev.filter(m => m.id !== userMessage.id));
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: err?.error?.details || err?.error?.message || err?.message || "Failed to get a response from the AI. Please try again.",
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex gap-4 animate-in fade-in zoom-in-95 duration-300 relative">
      {/* Conversation Sidebar */}
      <div className="w-64 border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex-col hidden lg:flex shrink-0">
        <div className="p-3 border-b border-border/60">
          <Button
            size="sm"
            className="w-full bg-brand hover:bg-brand-hover text-white shadow-soft"
            onClick={handleNewConversation}
          >
            <AppIcon name="Plus" className="h-4 w-4 mr-1.5" />
            {t("conversations.new")}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar pt-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">{t("conversations.empty")}</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`group relative flex items-center rounded-lg transition-all border ${activeConvId === conv.id ? "bg-muted border-border/80 shadow-sm" : "border-transparent hover:bg-muted/50"}`}
              >
                <button
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`flex-1 text-left px-3 py-2.5 min-w-0 ${activeConvId === conv.id ? "text-brand font-medium" : "text-foreground"}`}
                >
                  <p className="font-medium truncate text-xs">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {conv._count.messages} {t("common.documents")} · {activeConvId === conv.id ? t("conversations.viewing") : formatDate(new Date(conv.updatedAt))}
                  </p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
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
      <div className="flex-1 min-h-0 border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
        {!hasDocuments ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-background/50">
            <AppIcon name="Database" className="h-12 w-12 mb-4 opacity-30" />
            <h3 className="text-xl font-medium text-foreground mb-2">{t("workspace.noKnowledge")}</h3>
            <p className="max-w-sm mb-6">{t("workspace.noKnowledgeDesc")}</p>
            <Button onClick={onNavigateToSources}>
              <AppIcon name="Plus" className="mr-2 h-4 w-4" />
              {t("workspace.addSources")}
            </Button>
          </div>
        ) : (
          <ChatInterface
            chatbotId={projectId}
            chatbotName={project.name}
            messages={messages}
            isLoading={isTyping}
            branding={chatBranding}
            suggestedMessages={parsedSuggestedMessages}
            modelName={(project as any)?.modelId}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            onRateMessage={handleRateMessage}
            onStopGeneration={() => abortControllerRef.current?.abort()}
            className="h-full border-0 rounded-none shadow-none"
          />
        )}
      </div>

      {/* Open in New Tab */}
      <div className="absolute top-2 right-2 z-10">
        <Button variant="ghost" size="sm" asChild className="h-8 text-xs backdrop-blur-md bg-background/50 border border-border/50">
          <Link href={`/projects/${projectId}/chat`} target="_blank" rel="noopener noreferrer">
            <AppIcon name="ExternalLink" className="h-3.5 w-3.5 mr-1" />
            {t("chat.fullScreen")}
          </Link>
        </Button>
      </div>

      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        title="Message Limit Reached"
        description={`You have reached your limit of ${usageData?.limits.maxMessagesPerMonth} messages for your current plan. Upgrade to unlock more capacity.`}
        requiredPlan="PRO"
      />
    </div>
  );
}

