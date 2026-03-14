"use client";

import { useState, useCallback, useEffect } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
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

interface AnalyticsTabProps {
  projectId: string;
}

export function AnalyticsTab({ projectId }: AnalyticsTabProps) {
  const { t } = useTranslation();
  
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<"week" | "month" | "30days">("week");
  const [analyticsData, setAnalyticsData] = useState<{ dailyData: any[]; moduleData: any[]; stats: any } | null>(null);

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
  const stats = analyticsData?.stats || { totalMessages: 0, totalConversations: 0, avgMessagesPerConv: 0 };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300 h-full overflow-y-auto pb-8">
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
              className="h-8 px-2 text-xs border border-border rounded-md bg-background focus:ring-2 focus:ring-brand/50 transition-shadow"
            />
            <Label className="text-xs text-muted-foreground">{t("analytics.to")}</Label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setDatePreset("week"); }}
              className="h-8 px-2 text-xs border border-border rounded-md bg-background focus:ring-2 focus:ring-brand/50 transition-shadow"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Messages</p>
              <AppIcon name="MessageSquare" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover-lift" style={{ transitionDelay: "50ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Conversations</p>
              <AppIcon name="MessageCircle" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover-lift" style={{ transitionDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Avg Messages / Conv</p>
              <AppIcon name="Activity" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.avgMessagesPerConv}</div>
          </CardContent>
        </Card>
      </div>

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
          <CardTitle>Activity by Time of Day</CardTitle>
          <CardDescription>When users interact with your chatbot the most.</CardDescription>
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
                name="Messages"
                fill="hsl(var(--brand))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
