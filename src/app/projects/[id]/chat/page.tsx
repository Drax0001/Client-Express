"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatInterface, Message } from "@/components/chat/chat-interface";
import { useProject, useSendChatMessage } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ChatPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId);
  const sendMessageMutation = useSendChatMessage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Check if project has documents
  const hasDocuments = project && project.documentCount > 0;

  const handleSendMessage = async (content: string) => {
    if (!hasDocuments) {
      toast({
        title: "No documents available",
        description:
          "Please upload some documents to your project before starting a chat.",
        variant: "destructive",
      });
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await sendMessageMutation.mutateAsync({
        projectId,
        message: content,
      });

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response.answer,
        isUser: false,
        timestamp: new Date(),
        sourceCount: response.sourceCount,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content:
          error.error?.message ||
          "Sorry, I encountered an error while processing your question. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Chat failed",
        description:
          "There was an error processing your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  if (projectLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (projectError || !project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">Project not found</div>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${projectId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-semibold">{project.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {project.documentCount} document
                  {project.documentCount !== 1 ? "s" : ""} • Chat
                </p>
              </div>
            </div>
          </div>

          {!hasDocuments && (
            <div className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${projectId}`}>Upload Documents</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Chat Interface */}
      <div className="flex-1">
        {hasDocuments ? (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            disabled={sendMessageMutation.isPending}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto p-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                No documents available
              </h2>
              <p className="text-muted-foreground mb-6">
                You need to upload some documents to your project before you can
                start chatting. The AI will answer questions based on your
                uploaded content.
              </p>
              <Button asChild>
                <Link href={`/projects/${projectId}`}>Upload Documents</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
