"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ChatInterface, type SuggestedMessage } from "@/components/chatbots/chat-interface";
import { useProject } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  responseTime?: number;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoCreated = useRef(false);

  const parsedSuggestedMessages: SuggestedMessage[] = Array.isArray(project?.modules)
    ? (project.modules as SuggestedMessage[])
    : [];

  const chatBranding = project?.branding
    ? {
        ...(project.branding as object),
        chatbotDisplayName:
          (project.branding as any).chatbotDisplayName || project.name,
        welcomeMessage: (project.branding as any).welcomeMessage,
      }
    : { chatbotDisplayName: project?.name };

  // Create a new conversation
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
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  // Auto-create conversation on load
  useEffect(() => {
    if (hasAutoCreated.current || !project || projectLoading) return;
    hasAutoCreated.current = true;
    handleNewConversation();
  }, [project, projectLoading, handleNewConversation]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;

    const convId = activeConvId;
    if (!convId) {
      toast({ title: "No active conversation", variant: "destructive" });
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      role: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ message: content, conversationId: convId, conversationHistory }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      // Save user message
      await fetch(`/api/projects/${projectId}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content }),
      }).catch(() => {});

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        content: data.answer || data.response || "I'm unable to help with that right now.",
        role: "assistant",
        timestamp: new Date(),
        responseTime: data.responseTime,
      };

      setMessages(prev => [...prev, botMsg]);

      // Save bot message
      await fetch(`/api/projects/${projectId}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: botMsg.content }),
      }).catch(() => {});

    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          content: "Sorry, something went wrong. Please try again.",
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
  };

  if (projectLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Project not found.</p>
        <Button asChild variant="outline">
          <Link href="/projects">
            <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Slim top bar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href={`/projects/${projectId}`}>
            <AppIcon name="ArrowLeft" className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-sm font-medium truncate text-foreground">{project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNewConversation}
            title="New conversation"
          >
            <AppIcon name="Plus" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hidden sm:flex"
            asChild
          >
            <Link href={`/projects/${projectId}`}>
              <AppIcon name="Settings" className="h-3.5 w-3.5 mr-1" />
              Settings
            </Link>
          </Button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 min-h-0">
        {project.documentCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <AppIcon name="Database" className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No knowledge sources yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add documents to this project so the bot can answer questions about them.
            </p>
            <Button asChild>
              <Link href={`/projects/${projectId}`}>
                <AppIcon name="Plus" className="mr-2 h-4 w-4" />
                Add Documents
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
            modelName={(project as any)?.modelId}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            onStopGeneration={() => abortControllerRef.current?.abort()}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
