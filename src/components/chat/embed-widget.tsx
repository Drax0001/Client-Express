"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

import { SuggestedMessage } from "@/lib/api/types";

interface EmbedWidgetProps {
    projectId: string;
    projectName: string;
    leadCaptureEnabled?: boolean;
    leadCaptureFields?: string[] | null;
    branding?: any;
    modules?: any;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export function EmbedWidget({ projectId, projectName, leadCaptureEnabled, leadCaptureFields, branding, modules }: EmbedWidgetProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [inputMessage, setInputMessage] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [activeSubMessages, setActiveSubMessages] = React.useState<SuggestedMessage[]>([]);

    // Extract branding properties
    const primaryColor = branding?.primaryColor || "hsl(var(--brand))";
    const userBubbleColor = branding?.userBubbleColor || primaryColor;
    const botBubbleColor = branding?.botBubbleColor || "hsl(var(--background))";
    const headerColor = branding?.headerColor || primaryColor;
    const userTextColor = branding?.userTextColor || "#ffffff";
    const botTextColor = branding?.botTextColor || "hsl(var(--foreground))";
    const logoUrl = branding?.logoUrl;
    const chatbotDisplayName = branding?.chatbotDisplayName || projectName;
    const welcomeMessage = branding?.welcomeMessage || "Hi there! How can I help you today?";
    const showBranding = branding?.showBranding !== false;
    let suggestedMessages: SuggestedMessage[] = [];
    if (Array.isArray(modules)) {
        suggestedMessages = modules;
    } else if (Array.isArray(branding?.suggestedMessages)) {
        // Fallback for legacy format
        suggestedMessages = branding.suggestedMessages.map((m: any) => ({
            label: typeof m === "string" ? m : m.label,
            prompt: typeof m === "string" ? m : m.prompt
        }));
    }
    const footerLinks = branding?.footerLinks || [];

    // Lead capture state
    const [hasSubmittedLead, setHasSubmittedLead] = React.useState(false);
    const [isSubmittingLead, setIsSubmittingLead] = React.useState(false);
    const [leadForm, setLeadForm] = React.useState({ name: "", email: "", phone: "" });

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const submitted = sessionStorage.getItem(`lead_${projectId}`);
            if (submitted === "true") setHasSubmittedLead(true);
        }
    }, [projectId]);

    const showLeadForm = leadCaptureEnabled && !hasSubmittedLead;
    const requiredFields = leadCaptureFields || ["name", "email"];
    const needsName = requiredFields.includes("name");
    const needsEmail = requiredFields.includes("email");
    const needsPhone = requiredFields.includes("phone");

    const isLeadFormValid = () => {
        if (needsName && !leadForm.name.trim()) return false;
        if (needsEmail && !leadForm.email.trim()) return false;
        if (needsPhone && !leadForm.phone.trim()) return false;
        return true;
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLeadFormValid() || isSubmittingLead) return;

        setIsSubmittingLead(true);
        try {
            const res = await fetch(`/api/widget/${projectId}/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leadForm),
            });
            if (res.ok) {
                sessionStorage.setItem(`lead_${projectId}`, "true");
                setHasSubmittedLead(true);
            }
        } catch (error) {
            console.error("Failed to submit lead", error);
        } finally {
            setIsSubmittingLead(false);
        }
    };

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
    }, [messages, isOpen, showLeadForm]);

    const handleSendMessage = async (customPrompt?: string, subMsgs?: SuggestedMessage[]) => {
        const messageText = customPrompt || inputMessage.trim();
        if (showLeadForm || !messageText || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content: messageText,
            role: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        if (subMsgs && subMsgs.length > 0) {
            setActiveSubMessages(subMsgs);
        } else {
            setActiveSubMessages([]);
        }

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
                    <div className="p-4 flex items-center justify-between shrink-0" style={{ backgroundColor: headerColor, color: "#fff" }}>
                        <div className="flex items-center gap-3">
                            {logoUrl ? (
                                <div className="h-8 w-8 rounded-full bg-white p-1 overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                    <AppIcon name="Bot" className="h-5 w-5 text-white" />
                                </div>
                            )}
                            <div className="leading-tight flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">{chatbotDisplayName}</h3>
                                <span className="text-xs text-white/70">Online</span>
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
                            {showLeadForm ? (
                                <div className="p-5 bg-background rounded-2xl border border-border shadow-sm max-w-[90%] fade-in animate-in mx-auto mt-4">
                                    <h4 className="font-semibold text-foreground mb-1 text-[15px]">Welcome! 👋</h4>
                                    <p className="text-xs text-muted-foreground mb-4">Please fill out this form to start chatting with us.</p>
                                    <form onSubmit={handleLeadSubmit} className="space-y-3">
                                        {needsName && (
                                            <div>
                                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Name</label>
                                                <input required type="text" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-muted/30 focus-visible:outline-none focus:ring-1 focus:ring-brand" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
                                            </div>
                                        )}
                                        {needsEmail && (
                                            <div>
                                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Email</label>
                                                <input required type="email" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-muted/30 focus-visible:outline-none focus:ring-1 focus:ring-brand" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} />
                                            </div>
                                        )}
                                        {needsPhone && (
                                            <div>
                                                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Phone</label>
                                                <input required type="tel" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-muted/30 focus-visible:outline-none focus:ring-1 focus:ring-brand" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                                            </div>
                                        )}
                                        <Button type="submit" disabled={isSubmittingLead || !isLeadFormValid()} className="w-full h-9 mt-2 text-xs bg-brand hover:bg-brand-hover">
                                            {isSubmittingLead ? "Submitting..." : "Start Chatting"}
                                        </Button>
                                    </form>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                                    <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm border border-border">
                                        {logoUrl ? (
                                            <img src={logoUrl} className="max-w-[70%] max-h-[70%] object-contain" alt="Logo" />
                                        ) : (
                                            <AppIcon name="MessageSquare" className="h-5 w-5" style={{ color: primaryColor }} />
                                        )}
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{welcomeMessage}</p>

                                    {suggestedMessages.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-full">
                                            {[...activeSubMessages, ...suggestedMessages.filter(sm => !activeSubMessages.find(sub => sub.label === sm.label))].map((msg, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSendMessage(msg.prompt, msg.subMessages)}
                                                    className="text-xs px-3 py-1.5 rounded-full border shadow-sm transition-colors hover:opacity-80 text-left bg-background flex items-center gap-1.5"
                                                    style={{ borderColor: primaryColor, color: primaryColor }}
                                                >
                                                    {activeSubMessages.includes(msg) ? (
                                                        <AppIcon name="CornerDownRight" className="h-3 w-3" />
                                                    ) : (
                                                        <AppIcon name="Sparkles" className="h-3 w-3" />
                                                    )}
                                                    {msg.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
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
                                                "p-3 rounded-2xl text-[14px] leading-relaxed shadow-sm",
                                                msg.role === "user"
                                                    ? "rounded-br-sm"
                                                    : "border border-border rounded-bl-sm prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none"
                                            )}
                                            style={msg.role === "user" 
                                                ? { backgroundColor: userBubbleColor, color: userTextColor }
                                                : { backgroundColor: botBubbleColor, color: botTextColor }
                                            }
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
                                onClick={() => handleSendMessage()}
                                disabled={!inputMessage.trim() || isLoading}
                                className="absolute right-1 bottom-1 h-9 w-9 rounded-full text-white transition-all shadow-sm shrink-0 hover:opacity-90"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <AppIcon name="Send" className="h-4 w-4 ml-0.5" />
                            </Button>
                        </div>
                        {showBranding && (
                            <div className="mt-2 text-center text-[10px] text-muted-foreground flex flex-col gap-1 items-center">
                                <a href="https://example.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                                    Powered by ClientExpress
                                </a>
                            </div>
                        )}
                        {footerLinks.length > 0 && (
                            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
                                {footerLinks.map((link: any, i: number) => (
                                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl transition-transform hover:scale-105 pointer-events-auto flex items-center justify-center p-0 group"
                    style={{ backgroundColor: primaryColor }}
                >
                    <AppIcon name="MessageSquare" className="h-6 w-6 text-white group-hover:animate-pulse" />
                </Button>
            )}
        </div>
    );
}
