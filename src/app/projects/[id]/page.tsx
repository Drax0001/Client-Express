"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
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

// Define the message types locally since ChatInterface uses its own internal types
interface Source {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  relevanceScore: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Source[];
  tokensUsed?: number;
  responseTime?: number;
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

  // Mock data for analytics
  const mockLineData = [
    { name: "Mon", messages: 12 },
    { name: "Tue", messages: 19 },
    { name: "Wed", messages: 15 },
    { name: "Thu", messages: 22 },
    { name: "Fri", messages: 30 },
    { name: "Sat", messages: 25 },
    { name: "Sun", messages: 18 },
  ];

  const mockBarData = [
    { name: "Pricing", requests: 45 },
    { name: "Support", requests: 30 },
    { name: "Features", requests: 25 },
    { name: "Integration", requests: 15 },
  ];

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

    try {
      const startTime = performance.now();
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

      const response = await sendMessageMutation.mutateAsync({
        projectId,
        message: content,
        conversationHistory,
      });

      const endTime = performance.now();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: response.answer,
        role: "assistant",
        timestamp: new Date(),
        responseTime: Math.round(endTime - startTime),
        sources: (response.sources || []).map((s, i) => ({
          id: `src-${i}`,
          title: s.title,
          snippet: s.snippet,
          relevanceScore: s.relevanceScore,
          url: s.url,
        })),
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
            <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
              <AppIcon name="Bot" className="h-6 w-6" />
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
          className="flex-1 flex flex-col min-h-0"
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

          <div className="flex-1 min-h-0 relative mt-6">
            {/* CHAT TAB */}
            <TabsContent
              value="chat"
              className="h-full m-0 data-[state=inactive]:hidden focus-visible:outline-none flex gap-6"
            >
              <div className="flex-1 border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {!hasDocuments ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-background/50">
                    <AppIcon
                      name="Database"
                      className="h-12 w-12 mb-4 opacity-30"
                    />
                    <h3 className="text-xl font-medium text-foreground mb-2">
                      No Knowledge Sources
                    </h3>
                    <p className="max-w-sm mb-6">
                      Your chatbot doesn't know anything yet. It needs documents
                      or web links to accurately answer questions.
                    </p>
                    <Button onClick={() => setActiveTab("sources")}>
                      <AppIcon name="Plus" className="mr-2 h-4 w-4" />
                      Add Sources
                    </Button>
                  </div>
                ) : (
                  <ChatInterface
                    chatbotId={projectId}
                    chatbotName={project.name}
                    messages={messages}
                    isLoading={isTyping}
                    onSendMessage={handleSendMessage}
                    onClearConversation={handleClearConversation}
                    className="h-full"
                  />
                )}
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
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Conversation Volume</CardTitle>
                    <CardDescription>
                      Number of messages processed by this chatbot over the last
                      7 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockLineData}>
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
                    <CardTitle>Popular Topics</CardTitle>
                    <CardDescription>
                      Most frequently discussed topics based on semantic
                      clustering.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mockBarData}
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
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Update your chatbot's basic information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Chatbot Name</Label>
                    <Input defaultValue={project.name} disabled />
                    <p className="text-xs text-muted-foreground">
                      Name modification is disabled for now.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions.
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
      </div>
    </MainLayout>
  );
}
