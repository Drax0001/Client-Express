"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface EmbedWidgetProps {
    projectId: string;
    projectName: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export function EmbedWidget({ projectId, projectName }: EmbedWidgetProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [inputMessage, setInputMessage] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Notify parent frame to resize
    React.useEffect(() => {
        try {
            window.parent.postMessage(
                { type: isOpen ? 'widget-open' : 'widget-close' },
                '*'
            );
        } catch (e) {
            // Ignore if not in iframe
        }
    }, [isOpen]);

    // Scroll to bottom
    React.useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content: inputMessage.trim(),
            role: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            const resp = await fetch(`/api/widget/${projectId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage.content,
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

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                content: data.answer,
                role: "assistant",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    content: error.message || "An error occurred while connecting to the assistant.",
                    role: "assistant",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // The actual render handles pointer-events so click-through works on transparent areas
    return (
        <div className="relative flex flex-col items-end pointer-events-auto">
            {/* Expanded Chat Window */}
            {isOpen && (
                <div className="w-[360px] h-[520px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-100px)] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300">

                    {/* Header */}
                    <div className="bg-brand text-white p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                <AppIcon name="Bot" className="h-5 w-5 text-white" />
                            </div>
                            <div className="leading-tight">
                                <h3 className="font-semibold text-sm">{projectName}</h3>
                                <span className="text-xs text-brand-foreground/80">Online</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <AppIcon name="X" className="h-4 w-4 text-white" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 p-4 bg-muted/30">
                        <div className="space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                                    <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm border border-border">
                                        <AppIcon name="MessageSquare" className="h-5 w-5 text-brand" />
                                    </div>
                                    <p className="text-sm">Hi there! How can I help you today?</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex flex-col gap-1 max-w-[85%]",
                                            msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "p-3 rounded-2xl text-[14px] leading-relaxed",
                                                msg.role === "user"
                                                    ? "bg-brand text-white rounded-br-sm"
                                                    : "bg-background border border-border text-foreground rounded-bl-sm shadow-sm prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none"
                                            )}
                                        >
                                            <div className="whitespace-pre-wrap">
                                                {msg.role === "user" ? (
                                                    msg.content
                                                ) : (
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground px-1">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className="flex gap-1 max-w-[85%] mr-auto items-start">
                                    <div className="p-4 rounded-2xl bg-background border border-border rounded-bl-sm shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-3 bg-background border-t border-border shrink-0">
                        <div className="relative flex items-end gap-2">
                            <Textarea
                                ref={textareaRef}
                                value={inputMessage}
                                onChange={(e) => {
                                    setInputMessage(e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message..."
                                className="min-h-[44px] max-h-[100px] resize-none pr-10 bg-muted/50 focus-visible:ring-1 focus-visible:ring-brand border-none text-[14px] scrollbar-hide py-3"
                                disabled={isLoading}
                                rows={1}
                            />
                            <Button
                                size="icon"
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="absolute right-1 bottom-1 h-9 w-9 rounded-full bg-brand hover:bg-brand-hover text-white transition-all shadow-sm shrink-0"
                            >
                                <AppIcon name="Send" className="h-4 w-4 ml-0.5" />
                            </Button>
                        </div>
                        <div className="mt-2 text-center">
                            <a href="https://example.com" target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                Powered by ClientExpress
                            </a>
                        </div>
                    </div>

                </div>
            )}

            {/* Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl bg-brand hover:bg-brand-hover transition-transform hover:scale-105 pointer-events-auto flex items-center justify-center p-0 group"
                >
                    <AppIcon name="MessageSquare" className="h-6 w-6 text-white group-hover:animate-pulse" />
                </Button>
            )}
        </div>
    );
}
