"use client";

import { useState, useEffect, useCallback } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  rating: string | null;
  wasResolved: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface LogsTabProps {
  projectId: string;
}

export function LogsTab({ projectId }: LogsTabProps) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "negative" | "unresolved">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [ratingUpdating, setRatingUpdating] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations`);
      if (res.ok) setConversations(await res.json());
    } catch { }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = async (convId: string) => {
    if (messages[convId]) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => ({ ...prev, [convId]: data.messages || [] }));
      }
    } catch { }
  };

  const handleExpand = (convId: string) => {
    if (expandedId === convId) {
      setExpandedId(null);
    } else {
      setExpandedId(convId);
      loadMessages(convId);
    }
  };

  const rateMessage = async (convId: string, msgId: string, rating: "positive" | "negative") => {
    setRatingUpdating(msgId);
    try {
      await fetch(`/api/projects/${projectId}/conversations/${convId}/messages/${msgId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      setMessages(prev => ({
        ...prev,
        [convId]: (prev[convId] || []).map(m => m.id === msgId ? { ...m, rating } : m),
      }));
    } catch { }
    setRatingUpdating(null);
  };

  const getConvDot = (convId: string) => {
    const msgs = messages[convId] || [];
    if (msgs.some(m => m.rating === "negative")) return "bg-red-500";
    if (msgs.some(m => m.rating === "positive")) return "bg-green-500";
    return "bg-muted-foreground/30";
  };

  const filtered = conversations.filter(c => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-4 pb-8 animate-in fade-in duration-300">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <AppIcon name="Search" className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("logs.search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "negative", "unresolved"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-brand hover:bg-brand-hover text-white" : ""}
            >
              {t(`logs.filter${f.charAt(0).toUpperCase() + f.slice(1)}` as any)}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <AppIcon name="MessageSquare" className="h-10 w-10 opacity-20" />
          <p className="text-sm">{t("logs.noConversations")}</p>
          <p className="text-xs">{t("logs.noConversationsDesc")}</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(conv => (
          <Card key={conv.id} className="border-border/60 shadow-sm overflow-hidden">
            <button
              className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
              onClick={() => handleExpand(conv.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getConvDot(conv.id)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {conv.title || t("logs.untitled")}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {conv._count.messages} {t("logs.messages")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(conv.updatedAt).toLocaleString()}
                  </p>
                </div>
                <AppIcon
                  name={expandedId === conv.id ? "ChevronUp" : "ChevronDown"}
                  className="h-4 w-4 text-muted-foreground shrink-0"
                />
              </div>
            </button>

            {expandedId === conv.id && (
              <CardContent className="pt-0 pb-4 px-4 border-t border-border/40">
                <div className="space-y-3 mt-3 max-h-[400px] overflow-y-auto">
                  {!messages[conv.id] && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin-slow rounded-full h-5 w-5 border-b-2 border-brand" />
                    </div>
                  )}
                  {(messages[conv.id] || []).map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-brand text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        {msg.content}
                        {msg.role === "assistant" && (
                          <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-border/20">
                            <button
                              onClick={() => rateMessage(conv.id, msg.id, "positive")}
                              disabled={ratingUpdating === msg.id}
                              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${msg.rating === "positive" ? "text-green-500" : "text-muted-foreground hover:text-green-500"}`}
                            >
                              👍
                            </button>
                            <button
                              onClick={() => rateMessage(conv.id, msg.id, "negative")}
                              disabled={ratingUpdating === msg.id}
                              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${msg.rating === "negative" ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
                            >
                              👎
                            </button>
                            {!msg.wasResolved && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{t("logs.noContext")}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
