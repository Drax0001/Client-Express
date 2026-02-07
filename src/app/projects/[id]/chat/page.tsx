"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatPanel, Message } from "@/components/chat/chat-panel";
import { useProject, useSendChatMessage } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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

  // Load messages from localStorage on mount and when projectId changes
  useEffect(() => {
    const storedMessages = localStorage.getItem(`chat-messages-${projectId}`);
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        // Ensure timestamps are Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error(
          "Failed to load chat messages from localStorage:",
          error,
        );
      }
    }
  }, [projectId]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-messages-${projectId}`, JSON.stringify(messages));
    }
  }, [messages, projectId]);

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
            <Link href="/projects">
              <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col min-h-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${projectId}`}>
                <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg shadow-soft">
                <AppIcon
                  name="MessageSquare"
                  className="h-5 w-5 text-primary-foreground"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {project.documentCount} document
                  {project.documentCount !== 1 ? "s" : ""} • Chat
                </p>
              </div>
            </div>
          </div>

          {!hasDocuments && (
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}`}>Upload Documents</Link>
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 mt-6">
          {hasDocuments ? (
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
              disabled={sendMessageMutation.isPending}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto p-8">
                <AppIcon
                  name="MessageSquare"
                  className="h-16 w-16 text-muted-foreground mx-auto mb-4"
                />
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
    </MainLayout>
  );
}
