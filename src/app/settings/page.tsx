"use client";

import { useEffect, useState, Suspense } from "react";
import { useTranslation } from "@/lib/i18n";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import Link from "next/link";
import { ApiKeysTab } from "@/components/profile/api-keys-tab";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
};

// Technical defaults removed per user request

function SettingsInner() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);

  const loadProfile = async () => {
    const response = await fetch("/api/profile");
    if (!response.ok) return;
    const data = await response.json();
    setProfile(data);
    setProfileName(data?.name ?? "");
  };



  const loadUsage = async () => {
    const response = await fetch("/api/usage");
    if (!response.ok) return;
    const data = await response.json();
    setUsageData(data);
  };

  useEffect(() => {
    loadProfile();
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profileName }),
    });
    setSavingProfile(false);
    if (response.ok) {
      await loadProfile();
      toast({ title: "Profile updated" });
      return;
    }
    const body = await response.json().catch(() => ({}));
    toast({
      title: "Profile update failed",
      description: body?.details || "Please try again.",
      variant: "destructive",
    });
  };



  return (
    <div className="max-w-4xl max-md:mt-4 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-[15px]">
            {t("settings.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline" className="sm:self-end hover-lift border-border/60">
          <Link href="/projects" className="flex items-center gap-2">
            <AppIcon name="LayoutDashboard" className="h-4 w-4" />
            {t("workspace.backToDashboard")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-8 bg-muted/50 border border-border/50 p-1 w-full sm:w-auto overflow-x-auto flex sm:inline-flex justify-start">
          <TabsTrigger value="general" className="rounded-md flex-1 sm:flex-none">
            {t("settings.general")}
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-md flex-1 sm:flex-none">
            {t("settings.billing")}
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="rounded-md flex-1 sm:flex-none">
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 min-h-[600px] animate-tab-in">
          <Card className="border-border/60 bg-card/50 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">{t("settings.profile")}</CardTitle>
              <CardDescription>{t("settings.profileDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{t("settings.name")}</label>
                <Input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Your name"
                  className="max-w-md bg-background focus-visible:ring-brand"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{t("settings.email")}</label>
                <Input
                  value={profile?.email ?? ""}
                  disabled
                  className="max-w-md bg-muted/40 text-muted-foreground opacity-80"
                />
                <p className="text-xs text-muted-foreground">{t("settings.emailNote")}</p>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/40 mt-4">
                <Button onClick={saveProfile} disabled={savingProfile} className="bg-brand hover:bg-brand-hover text-white transition-colors">
                  {savingProfile ? t("settings.saving") : t("settings.saveProfile")}
                </Button>
                <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  {t("common.signOut")}
                </Button>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 min-h-[600px] animate-tab-in">
          <Card className="border-border/60 bg-card/50 shadow-sm backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{t("settings.planUsage")}</CardTitle>
              <CardDescription>{t("settings.planUsageDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {!usageData ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-brand"></div>
                  <p className="text-sm text-muted-foreground">Loading billing details...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Current Plan Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-border/50 rounded-xl bg-gradient-to-br from-muted/30 to-background shadow-inner gap-4 relative overflow-hidden">
                    {/* Decorative blurred background */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 w-full sm:w-auto">
                      <div className="flex items-center gap-2 mb-1">
                        <AppIcon name="Zap" className="h-5 w-5 text-brand" />
                        <h4 className="font-semibold text-lg text-foreground">{usageData.plan} {t("settings.plan")}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.resetDate")} <span className="text-foreground font-medium">{new Date(usageData.usage.resetDate).toLocaleDateString()}</span>.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                      {usageData.plan === "FREE" && (
                        <Button asChild className="relative z-10 w-full sm:w-auto bg-brand hover:bg-brand-hover text-white shadow-md hover:shadow-lg transition-all">
                          <Link href="/checkout?plan=PRO">{t("settings.upgradeToProBtn")}</Link>
                        </Button>
                      )}
                      {usageData.plan !== "BUSINESS" && (
                        <Button asChild variant={usageData.plan === "FREE" ? "outline" : "default"} className={usageData.plan === "FREE" ? "relative z-10 w-full sm:w-auto bg-background hover:bg-muted text-foreground transition-all" : "relative z-10 w-full sm:w-auto bg-brand hover:bg-brand-hover text-white shadow-md hover:shadow-lg transition-all"}>
                          <Link href="/checkout?plan=BUSINESS">{t("settings.upgradeToBusinessBtn")}</Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Limits Progress Bars */}
                  <div className="grid gap-8 sm:grid-cols-2">
                    {/* Messages Progress */}
                    <div className="space-y-3 p-4 border border-border/40 rounded-xl bg-background/50">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("settings.monthlyMessages")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Used traversing your knowledge</p>
                        </div>
                        <span className="text-sm font-semibold bg-surface px-2 py-0.5 rounded-md border border-border/40">
                          {usageData.usage.messagesThisMonth} <span className="text-muted-foreground font-normal">/</span> {usageData.limits.maxMessagesPerMonth === 999999 ? "∞" : usageData.limits.maxMessagesPerMonth}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, (usageData.usage.messagesThisMonth / usageData.limits.maxMessagesPerMonth) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Sources Progress */}
                    <div className="space-y-3 p-4 border border-border/40 rounded-xl bg-background/50">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("settings.documentSources")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Files & URLs combined</p>
                        </div>
                        <span className="text-sm font-semibold bg-surface px-2 py-0.5 rounded-md border border-border/40">
                          {usageData.usage.sourcesThisMonth} <span className="text-muted-foreground font-normal">/</span> {usageData.limits.maxSourcesTotal}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, (usageData.usage.sourcesThisMonth / usageData.limits.maxSourcesTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-left text-xs text-muted-foreground py-2 px-4 bg-muted/30 rounded-lg inline-block">
                    {t("settings.maxUploadSize")} <strong className="text-foreground">{usageData.limits.maxSourceSizeBytes / (1024 * 1024)} MB</strong>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API KEYS TAB */}
        <TabsContent value="apikeys" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 min-h-[600px] animate-tab-in">
          <ApiKeysTab plan={usageData?.plan || "FREE"} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex items-center justify-center p-12 text-muted-foreground min-h-[400px]">Loading Settings...</div>}>
        <SettingsInner />
      </Suspense>
    </MainLayout>
  );
}
