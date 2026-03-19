"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useDeleteProject } from "@/lib/api/hooks";

interface SettingsTabProps {
  projectId: string;
  project: any;
  refetch: () => void;
}

export function SettingsTab({ projectId, project, refetch }: SettingsTabProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const deleteProjectMutation = useDeleteProject();



  const handleDeleteProject = async () => {
    if (!window.confirm(t("settings.confirmDelete") || "Are you sure you want to delete this chatbot? This action cannot be undone.")) return;
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast({ title: t("workspace.deleteSuccess") || "Chatbot deleted" });
      router.push("/projects");
    } catch (error) {
      toast({ title: t("settings.failedDelete") || "Failed to delete", variant: "destructive" });
    }
  };

  // Lead capture state
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadCaptureFields, setLeadCaptureFields] = useState<string[]>(["name", "email"]);
  const [leadCaptureSaving, setLeadCaptureSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setLeadCaptureEnabled(project.leadCaptureEnabled ?? false);
      setLeadCaptureFields(project.leadCaptureFields ?? ["name", "email"]);
    }
  }, [project]);

  const handleSaveLeadCapture = async () => {
    setLeadCaptureSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadCaptureEnabled, leadCaptureFields }),
      });
      toast({ title: "Lead capture settings saved" });
      refetch();
    } catch {
      toast({ title: "Failed to save lead capture settings", variant: "destructive" });
    } finally {
      setLeadCaptureSaving(false);
    }
  };

  const toggleLeadField = (field: string) => {
    setLeadCaptureFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300 h-full overflow-y-auto pb-8">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>{t("settings.generalTitle")}</CardTitle>
          <CardDescription>{t("settings.generalDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.chatbotName")}</Label>
            <Input defaultValue={project.name} disabled className="opacity-70 bg-transparent" />
            <p className="text-xs text-muted-foreground">{t("settings.nameDisabled")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Lead Capture Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AppIcon name="Users" className="h-5 w-5 text-brand" />
            Lead Capture
          </CardTitle>
          <CardDescription>
            Show a pre-chat form to collect visitor contact information before they start a conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-background/50">
            <div>
              <p className="text-sm font-medium">Enable lead capture form</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Users will see a form before they can start chatting.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={leadCaptureEnabled}
              onClick={() => setLeadCaptureEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${leadCaptureEnabled ? "bg-brand" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${leadCaptureEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Fields to collect */}
          {leadCaptureEnabled && (
            <div className="space-y-3">
              <Label className="text-sm">Fields to collect</Label>
              <div className="flex gap-3 flex-wrap">
                {["name", "email", "phone"].map(field => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={leadCaptureFields.includes(field)}
                      onChange={() => toggleLeadField(field)}
                      className="h-4 w-4 accent-brand rounded"
                    />
                    <span className="text-sm capitalize">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              onClick={handleSaveLeadCapture}
              disabled={leadCaptureSaving}
              className="hover-lift"
            >
              {leadCaptureSaving ? (
                <>
                  <AppIcon name="Loader2" className="mr-2 h-4 w-4 animate-spin-slow" />
                  {t("settings.saving")}
                </>
              ) : (
                <>
                  <AppIcon name="Save" className="mr-2 h-4 w-4" />
                  Save Lead Capture
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>



      <Card className="border-destructive/30 shadow-sm bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings.dangerZone")}</CardTitle>
          <CardDescription className="text-destructive/80">{t("settings.dangerDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 rounded-xl bg-background/50 backdrop-blur-sm">
            <div>
              <h4 className="font-semibold text-destructive">{t("settings.deleteChatbot")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.deleteChatbotDesc")}</p>
            </div>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleteProjectMutation.isPending} className="whitespace-nowrap hover-lift">
              <AppIcon name="Trash2" className="mr-2 h-4 w-4" />
              {deleteProjectMutation.isPending ? t("settings.deleting") : t("settings.deleteChatbot")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
