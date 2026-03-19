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
  const [analyticsData, setAnalyticsData] = useState<{
    dailyData: any[];
    moduleData: any[];
    stats: any;
    topQuestions?: { question: string; count: number }[];
    localeBreakdown?: { locale: string; count: number }[];
  } | null>(null);


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
  const stats = analyticsData?.stats || { totalMessages: 0, totalConversations: 0, avgMessagesPerConv: 0, fallbackRate: 0 };
  const topQuestions: { question: string; count: number }[] = analyticsData?.topQuestions || [];
  const localeBreakdown: { locale: string; count: number }[] = analyticsData?.localeBreakdown || [];

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
              <p className="text-sm font-medium">{t("analytics.totalMessages")}</p>
              <AppIcon name="MessageSquare" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover-lift" style={{ transitionDelay: "50ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">{t("analytics.totalConversations")}</p>
              <AppIcon name="MessageCircle" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover-lift" style={{ transitionDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">{t("analytics.avgMessagesPerConvLong")}</p>
              <AppIcon name="Activity" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.avgMessagesPerConv}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover-lift" style={{ transitionDelay: "150ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Fallback Rate</p>
              <AppIcon name="AlertCircle" className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`text-2xl font-bold ${stats.fallbackRate > 30 ? "text-destructive" : "text-foreground"}`}>
              {stats.fallbackRate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bot responses without relevant context</p>
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
                stroke="#0ea5e9"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#0ea5e9"
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
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ fill: "#0ea5e9", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>{t("analytics.activityByTime")}</CardTitle>
          <CardDescription>{t("analytics.activityByTimeDesc")}</CardDescription>
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
                stroke="#0ea5e9"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#0ea5e9"
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
                name={t("analytics.totalMessages")}
                fill="#0ea5e9"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Questions */}
      {topQuestions.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppIcon name="HelpCircle" className="h-4 w-4 text-brand" />
              Top Questions (30 days)
            </CardTitle>
            <CardDescription>Most frequently asked user questions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 pt-0.5">{i + 1}.</span>
                  <p className="text-sm flex-1 min-w-0 truncate">{q.question}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full shrink-0">{q.count}×</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locale Breakdown */}
      {localeBreakdown.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppIcon name="Globe" className="h-4 w-4 text-brand" />
              User Languages (30 days)
            </CardTitle>
            <CardDescription>Detected user browser languages from Accept-Language header</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {localeBreakdown.map(l => (
                <div key={l.locale} className="flex items-center gap-1.5 bg-muted/40 border border-border/40 rounded-full px-3 py-1">
                  <span className="text-sm font-medium uppercase">{l.locale}</span>
                  <span className="text-xs text-muted-foreground">{l.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

