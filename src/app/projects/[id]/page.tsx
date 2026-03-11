"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/layout/main-layout";
import { UploadInterface } from "@/components/documents/upload-interface";
import { DocumentList } from "@/components/documents/document-list";
import { ChatInterface } from "@/components/chatbots/chat-interface";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useProject,
  useDeleteDocument,
  useRetryDocument,
  useSendChatMessage,
  useDeleteProject,
} from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { ModuleSelector, type Module } from "@/components/chatbots/module-selector";
import type { ChatBranding } from "@/components/chatbots/chat-interface";

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

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { toast } = useToast();

  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();
  const deleteProjectMutation = useDeleteProject();
  const sendMessageMutation = useSendChatMessage();

  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { t } = useTranslation();

  // Conversations state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Settings: Branding editor state
  const [editPrimaryColor, setEditPrimaryColor] = useState("");
  const [editUserBubble, setEditUserBubble] = useState("");
  const [editBotBubble, setEditBotBubble] = useState("");
  const [editHeaderColor, setEditHeaderColor] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editWelcomeMsg, setEditWelcomeMsg] = useState("");
  const [editUserTextColor, setEditUserTextColor] = useState("");
  const [editBotTextColor, setEditBotTextColor] = useState("");
  const [brandingSaving, setBrandingSaving] = useState(false);

  // AbortController for stop generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize branding editor when project loads
  useEffect(() => {
    if (project?.branding) {
      const b = project.branding as any;
      setEditPrimaryColor(b.primaryColor || "#6366f1");
      setEditUserBubble(b.userBubbleColor || "#6366f1");
      setEditBotBubble(b.botBubbleColor || "#f1f5f9");
      setEditHeaderColor(b.headerColor || "#ffffff");
      setEditLogoUrl(b.logoUrl || "");
      setEditDisplayName(b.chatbotDisplayName || "");
      setEditWelcomeMsg(b.welcomeMessage || "");
      setEditUserTextColor(b.userTextColor || "#ffffff");
      setEditBotTextColor(b.botTextColor || "#1e293b");
    }
  }, [project?.branding]);

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    try {
      // Upload logo file first if present
      let finalLogoUrl = editLogoUrl || undefined;
      if (editLogoFile) {
        const formData = new FormData();
        formData.append("logo", editLogoFile);
        const uploadRes = await fetch(`/api/projects/${projectId}/logo/upload`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalLogoUrl = uploadData.logoUrl;
        }
      }

      await fetch(`/api/projects/${projectId}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: editPrimaryColor,
          userBubbleColor: editUserBubble,
          botBubbleColor: editBotBubble,
          headerColor: editHeaderColor,
          userTextColor: editUserTextColor,
          botTextColor: editBotTextColor,
          logoUrl: finalLogoUrl,
          chatbotDisplayName: editDisplayName || undefined,
          welcomeMessage: editWelcomeMsg || undefined,
        }),
      });
      toast({ title: t("common.saved") || "Branding saved" });
      setEditLogoFile(null);
      refetch();
    } catch {
      toast({ title: "Failed to save branding", variant: "destructive" });
    } finally {
      setBrandingSaving(false);
    }
  };

  // Analytics state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<"week" | "month" | "30days">("week");
  const [analyticsData, setAnalyticsData] = useState<{ dailyData: any[]; moduleData: any[]; stats: any } | null>(null);
  const hasAutoCreated = useRef(false);

  // Fetch real analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/projects/${projectId}/analytics?${params}`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch { }
  }, [projectId, dateFrom, dateTo]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const lineData = analyticsData?.dailyData || [];
  const barData = analyticsData?.moduleData || [];

  // Parse modules from project
  const projectModules: Module[] = Array.isArray(project?.modules) ? (project.modules as Module[]) : [];

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`);
      if (res.ok) setConversations(await res.json());
    } catch { }
  };

  // Load conversations + auto-create on mount
  useEffect(() => {
    loadConversations();
  }, [projectId]);

  // Auto-create conversation when project loads (if no modules to pick from)
  useEffect(() => {
    if (hasAutoCreated.current || !project || isLoading) return;
    if (projectModules.length === 0 && !activeConvId) {
      hasAutoCreated.current = true;
      handleNewConversation();
    }
  }, [project, isLoading]);

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: selectedModule?.name || "New Conversation", module: selectedModule?.name }),
      });
      if (res.ok) {
        const conv = await res.json();
        setActiveConvId(conv.id);
        setMessages([]);
        loadConversations();
      }
    } catch { }
  };

  // Auto-title conversation after first message
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

  // Rate a message
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

  // Parse branding for ChatInterface
  const chatBranding: ChatBranding | null = project?.branding ? (project.branding as ChatBranding) : null;

  // Load conversation messages
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

  // Load chat messages from localStorage
  useEffect(() => {
    const storedMessages = localStorage.getItem(`chat-messages-${projectId}`);
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        setMessages(
          parsed.map((msg: any) => ({
            ...msg,
            role: msg.role || (msg.isUser === false ? "assistant" : "user"),
            timestamp: new Date(msg.timestamp),
          })),
        );
      } catch (err) {
        console.error("Failed to parse cached messages", err);
      }
    }
  }, [projectId]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `chat-messages-${projectId}`,
        JSON.stringify(messages),
      );
    }
  }, [messages, projectId]);

  // Derive a stable boolean primitive to avoid re-creating the interval on every fetch
  const hasInFlightDocs = (project?.documents || []).some(
    (d) => d.status === "pending" || d.status === "processing",
  );

  // Polling for documents in progress — only runs when there are in-flight docs
  useEffect(() => {
    if (!hasInFlightDocs) return;

    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [hasInFlightDocs, refetch]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <AppIcon
              name="Loader2"
              className="h-8 w-8 animate-spin text-brand"
            />
            <p>Loading project workspace...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="AlertTriangle" className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Button asChild>
              <Link href="/projects">
                <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasDocuments = project.documentCount > 0;

  const handleSendMessage = async (content: string) => {
    if (!hasDocuments) {
      toast({
        title: "Knowledge base empty",
        description:
          "Please add documents to the Sources tab before testing the chatbot.",
        variant: "destructive",
      });
      setActiveTab("sources");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Auto-title conversation after first user message
    if (activeConvId && messages.length === 0) {
      autoTitleConversation(activeConvId, content);
    }

    try {
      const startTime = performance.now();
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

      const response = await sendMessageMutation.mutateAsync({
        projectId,
        message: content,
        conversationId: activeConvId || undefined,
        conversationHistory,
      });

      const endTime = performance.now();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: response.answer,
        role: "assistant",
        timestamp: new Date(),
        responseTime: Math.round(endTime - startTime),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content:
            err?.error?.message ||
            "Failed to get a response from the AI. Please try again.",
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
    localStorage.removeItem(`chat-messages-${projectId}`);
    toast({ title: "Conversation cleared" });
  };

  const handleDeleteProject = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this chatbot? This action cannot be undone.",
      )
    )
      return;

    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast({ title: "Chatbot deleted" });
      router.push("/projects");
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto animate-in fade-in duration-300">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden"
              style={chatBranding?.primaryColor ? { backgroundColor: chatBranding.primaryColor + '1a', borderColor: chatBranding.primaryColor + '33' } : { backgroundColor: 'hsl(var(--brand) / 0.1)', borderColor: 'hsl(var(--brand) / 0.2)' }}
            >
              {chatBranding?.logoUrl ? (
                <img src={chatBranding.logoUrl} alt={project.name} className="h-8 w-8 object-contain" />
              ) : (
                <AppIcon name="Bot" className="h-6 w-6" style={chatBranding?.primaryColor ? { color: chatBranding.primaryColor } : undefined} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {project.name}
                </h1>
                <Badge
                  variant={hasDocuments ? "default" : "secondary"}
                  className={
                    hasDocuments
                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      : ""
                  }
                >
                  {hasDocuments ? "Ready" : "Setup Required"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <AppIcon name="FileText" className="h-3.5 w-3.5" />
                  {project.documentCount} sources
                </span>
                <span>•</span>
                <span>
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-9">
              <Link href="/projects">
                <AppIcon name="LayoutGrid" className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabbed Workspace */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 w-full overflow-hidden"
        >
          <TabsList className="shrink-0 w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-6 overflow-x-auto hide-scrollbar">
            <TabsTrigger
              value="chat"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 h-full gap-2"
            >
              <AppIcon name="MessageSquare" className="h-4 w-4" />
              Chat Preview
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 h-full gap-2"
            >
              <AppIcon name="Database" className="h-4 w-4" />
              Knowledge Sources
            </TabsTrigger>
            <TabsTrigger
              value="embed"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 h-full gap-2"
            >
              <AppIcon name="Code" className="h-4 w-4" />
              Embed Widget
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 h-full gap-2"
            >
              <AppIcon name="BarChart" className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-3 h-full gap-2"
            >
              <AppIcon name="Settings" className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 relative mt-6 w-full overflow-hidden">
            <TabsContent
              value="chat"
              className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none flex gap-4"
            >
              {/* Conversation Sidebar */}
              <div className="w-56 shrink-0 border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex-col hidden lg:flex">
                <div className="p-3 border-b border-border/60">
                  <Button
                    size="sm"
                    className="w-full bg-brand hover:bg-brand-hover text-white"
                    onClick={() => {
                      setSelectedModule(null);
                      if (projectModules.length === 0) {
                        handleNewConversation();
                      }
                    }}
                  >
                    <AppIcon name="Plus" className="h-4 w-4 mr-1" />
                    {t("conversations.new")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground text-center">{t("conversations.empty")}</p>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left px-3 py-2.5 text-sm border-b border-border/30 hover:bg-muted/50 transition-colors ${activeConvId === conv.id ? "bg-brand/10 text-brand" : "text-foreground"}`}
                      >
                        <p className="font-medium truncate text-xs">{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground">{conv._count.messages} msgs · {conv.status === "ended" ? "Ended" : "Active"}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {!hasDocuments ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-background/50">
                    <AppIcon name="Database" className="h-12 w-12 mb-4 opacity-30" />
                    <h3 className="text-xl font-medium text-foreground mb-2">{t("workspace.noKnowledge")}</h3>
                    <p className="max-w-sm mb-6">{t("workspace.noKnowledgeDesc")}</p>
                    <Button onClick={() => setActiveTab("sources")}>
                      <AppIcon name="Plus" className="mr-2 h-4 w-4" />
                      {t("workspace.addSources")}
                    </Button>
                  </div>
                ) : !activeConvId && projectModules.length > 0 ? (
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
                    chatbotName={project.name}
                    messages={messages}
                    isLoading={isTyping}
                    branding={chatBranding}
                    onSendMessage={handleSendMessage}
                    onClearConversation={handleClearConversation}
                    onRateMessage={handleRateMessage}
                    className="h-full"
                  />
                )}
              </div>

              {/* Open in New Tab */}
              <div className="absolute top-2 right-2 z-10">
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                  <a href={`/chat/${projectId}`} target="_blank" rel="noopener noreferrer">
                    <AppIcon name="ExternalLink" className="h-3.5 w-3.5 mr-1" />
                    {t("workspace.openNewTab")}
                  </a>
                </Button>
              </div>
            </TabsContent>

            {/* SOURCES TAB */}
            <TabsContent
              value="sources"
              className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none space-y-6 overflow-y-auto pb-10"
            >
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/30 border-b border-border/60">
                  <CardTitle className="text-lg">Add New Sources</CardTitle>
                  <CardDescription>
                    Upload files or import URLs to expand the chatbot's
                    knowledge.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <UploadInterface
                    projectId={projectId}
                    onUploadSuccess={() => {
                      refetch();
                      toast({ title: "Sources added successfully" });
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/30 border-b border-border/60 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Trained Documents</CardTitle>
                    <CardDescription>
                      Manage the files currently powering this chatbot.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {project.documents?.length || 0} Total
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {project.documents?.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <p>No documents uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-6">
                      <DocumentList
                        documents={project.documents || []}
                        loading={false}
                        onRetry={async (documentId) => {
                          await retryDocument.mutateAsync(documentId);
                          refetch();
                        }}
                        onDelete={async (documentId) => {
                          await deleteDocument.mutateAsync(documentId);
                          refetch();
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* EMBED TAB */}
            <TabsContent
              value="embed"
              className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none space-y-6 overflow-y-auto pb-10"
            >
              {/* SHARE SECTION */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AppIcon name="Share2" className="h-5 w-5 text-brand" />
                    Share Your Chatbot
                  </CardTitle>
                  <CardDescription>
                    Share this link or QR code so anyone can chat with your bot
                    publicly. Note: public usage counts against your plan&apos;s
                    message quota.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.origin}/chat/${projectId}`
                          : `/chat/${projectId}`
                      }
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/chat/${projectId}`;
                        navigator.clipboard.writeText(url);
                        toast({
                          title: "Link copied!",
                          description:
                            "Public chatbot URL copied to clipboard.",
                        });
                      }}
                    >
                      <AppIcon name="Copy" className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/chat/${projectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <AppIcon name="ExternalLink" className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      Scan to open the chatbot on any device
                    </p>
                    <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
                      <QRCodeSVG
                        value={
                          typeof window !== "undefined"
                            ? `${window.location.origin}/chat/${projectId}`
                            : `https://yourdomain.com/chat/${projectId}`
                        }
                        size={180}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const svg = document.querySelector(
                          ".qr-download-target svg",
                        );
                        if (!svg) return;
                        const svgData = new XMLSerializer().serializeToString(
                          svg,
                        );
                        const blob = new Blob([svgData], {
                          type: "image/svg+xml",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${project.name}-qr.svg`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <AppIcon name="Download" className="mr-2 h-4 w-4" />
                      Download QR Code
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* EMBED WIDGET CODE */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Embed Widget Code</CardTitle>
                  <CardDescription>
                    Copy and paste this code to add the chatbot widget to your
                    website.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto text-muted-foreground border border-border">
                    {`<script>
  window.chatbotConfig = {
    chatbotId: "${projectId}",
  };
</script>
<script src="${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/widget.js" defer></script>`}
                  </div>
                  <div className="mt-6">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const origin = window.location.origin;
                        navigator.clipboard.writeText(`<script>
  window.chatbotConfig = {
    chatbotId: "${projectId}",
  };
</script>
<script src="${origin}/widget.js" defer></script>`);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      <AppIcon name="Copy" className="mr-2 h-4 w-4" />
                      Copy Snippet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ANALYTICS TAB */}
            <TabsContent
              value="analytics"
              className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none"
            >
              <div className="flex flex-col gap-6">
                {/* Calendar Filter */}
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {(["week", "month", "30days"] as const).map((preset) => (
                        <Button
                          key={preset}
                          variant={datePreset === preset ? "default" : "outline"}
                          size="sm"
                          className={datePreset === preset ? "bg-brand hover:bg-brand-hover text-white" : ""}
                          onClick={() => {
                            setDatePreset(preset);
                            setDateFrom("");
                            setDateTo("");
                          }}
                        >
                          {preset === "week" ? t("analytics.thisWeek") : preset === "month" ? t("analytics.thisMonth") : t("analytics.last30Days")}
                        </Button>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{t("analytics.from")}</Label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setDatePreset("week"); }}
                        className="h-8 px-2 text-xs border border-border rounded-md bg-background"
                      />
                      <Label className="text-xs text-muted-foreground">{t("analytics.to")}</Label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setDatePreset("week"); }}
                        className="h-8 px-2 text-xs border border-border rounded-md bg-background"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>{t("analytics.conversationVolume")}</CardTitle>
                    <CardDescription>{t("analytics.conversationVolumeDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="messages"
                          stroke="hsl(var(--brand))"
                          strokeWidth={3}
                          dot={{ fill: "hsl(var(--brand))", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>{t("analytics.popularTopics")}</CardTitle>
                    <CardDescription>{t("analytics.popularTopicsDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="requests"
                          fill="hsl(var(--brand))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent
              value="settings"
              className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none max-w-2xl"
            >
              <Card className="border-border/60 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle>{t("settings.generalTitle")}</CardTitle>
                  <CardDescription>
                    {t("settings.generalDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("settings.chatbotName")}</Label>
                    <Input defaultValue={project.name} disabled />
                    <p className="text-xs text-muted-foreground">
                      {t("settings.nameDisabled")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Branding Editor */}
              <Card className="border-border/60 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AppIcon name="Palette" className="h-5 w-5 text-brand" />
                    {t("wizard.brandingTitle")}
                  </CardTitle>
                  <CardDescription>{t("wizard.brandingDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("wizard.chatbotDisplayName")}</Label>
                      <Input placeholder={t("wizard.chatbotDisplayNamePlaceholder")} value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("wizard.welcomeMessage")}</Label>
                      <Input placeholder={t("wizard.welcomeMessagePlaceholder")} value={editWelcomeMsg} onChange={e => setEditWelcomeMsg(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("wizard.primaryColor")}</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <Input value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("wizard.headerColor")}</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={editHeaderColor} onChange={e => setEditHeaderColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <Input value={editHeaderColor} onChange={e => setEditHeaderColor(e.target.value)} className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("wizard.userBubble")}</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={editUserBubble} onChange={e => setEditUserBubble(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <Input value={editUserBubble} onChange={e => setEditUserBubble(e.target.value)} className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("wizard.botBubble")}</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={editBotBubble} onChange={e => setEditBotBubble(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <Input value={editBotBubble} onChange={e => setEditBotBubble(e.target.value)} className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>User Text Color</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={editUserTextColor} onChange={e => setEditUserTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <Input value={editUserTextColor} onChange={e => setEditUserTextColor(e.target.value)} className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Bot Text Color</Label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={editBotTextColor} onChange={e => setEditBotTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                        <Input value={editBotTextColor} onChange={e => setEditBotTextColor(e.target.value)} className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t("wizard.logoUpload")}</Label>
                      <div className="flex items-center gap-4">
                        {(editLogoPreview || editLogoUrl) && (
                          <img src={editLogoPreview || editLogoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain border border-border" />
                        )}
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium">
                          <AppIcon name="Upload" className="h-4 w-4" />
                          {editLogoFile ? editLogoFile.name : (editLogoUrl ? t("logo.change") : t("wizard.logoUpload"))}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setEditLogoFile(file);
                                setEditLogoPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        {(editLogoFile || editLogoUrl) && (
                          <Button variant="ghost" size="sm" onClick={() => { setEditLogoFile(null); setEditLogoPreview(null); setEditLogoUrl(""); }}>
                            <AppIcon name="X" className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button onClick={handleSaveBranding} disabled={brandingSaving} className="bg-brand hover:bg-brand-hover text-white">
                      {brandingSaving ? t("settings.saving") : t("common.save")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    {t("settings.dangerZone")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.dangerDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                    <div>
                      <h4 className="font-medium text-destructive">
                        Delete Chatbot
                      </h4>
                      <p className="text-sm text-destructive/80">
                        Permanently delete this project, its documents, and all
                        chat history.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteProject}
                      disabled={deleteProjectMutation.isPending}
                    >
                      {deleteProjectMutation.isPending
                        ? "Deleting..."
                        : "Delete Project"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div >
    </MainLayout >
  );
}
