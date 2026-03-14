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

  // Settings: Branding editor state
  const [editPrimaryColor, setEditPrimaryColor] = useState("");
  const [editUserBubble, setEditUserBubble] = useState("");
  const [editBotBubble, setEditBotBubble] = useState("");
  const [editHeaderColor, setEditHeaderColor] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editWelcomeMsg, setEditWelcomeMsg] = useState("");
  const [editUserTextColor, setEditUserTextColor] = useState("");
  const [editBotTextColor, setEditBotTextColor] = useState("");
  const [editFooterLinks, setEditFooterLinks] = useState<{label: string, url: string}[]>([]);
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => {
    if (project?.branding) {
      const b = project.branding as any;
      setEditPrimaryColor(b.primaryColor || "#8B5CF6");
      setEditUserBubble(b.userBubbleColor || "#8B5CF6");
      setEditBotBubble(b.botBubbleColor || "#F8FAFC");
      setEditHeaderColor(b.headerColor || "#ffffff");
      setEditLogoUrl(b.logoUrl || "");
      setEditDisplayName(b.chatbotDisplayName || "");
      setEditWelcomeMsg(b.welcomeMessage || "");
      setEditUserTextColor(b.userTextColor || "#ffffff");
      setEditBotTextColor(b.botTextColor || "#0F172A");
      setEditFooterLinks(b.footerLinks || []);
    }
  }, [project?.branding]);

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    try {
      let finalLogoUrl = editLogoUrl || undefined;
      if (editLogoFile) {
        const formData = new FormData();
        formData.append("logo", editLogoFile);
        const uploadRes = await fetch(`/api/projects/${projectId}/logo/upload`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalLogoUrl = uploadData.logoUrl;
        }
      }

      await fetch(`/api/projects/${projectId}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: editPrimaryColor,
          userBubbleColor: editUserBubble,
          botBubbleColor: editBotBubble,
          headerColor: editHeaderColor,
          userTextColor: editUserTextColor,
          botTextColor: editBotTextColor,
          logoUrl: finalLogoUrl,
          chatbotDisplayName: editDisplayName || undefined,
          welcomeMessage: editWelcomeMsg || undefined,
          footerLinks: editFooterLinks.length > 0 ? editFooterLinks : undefined,
        }),
      });
      toast({ title: t("settings.brandingSaved") || "Branding saved" });
      setEditLogoFile(null);
      refetch();
    } catch {
      toast({ title: t("settings.failedBranding") || "Failed to save branding", variant: "destructive" });
    } finally {
      setBrandingSaving(false);
    }
  };

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
            <Input defaultValue={project.name} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">{t("settings.nameDisabled")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Branding Editor */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AppIcon name="Palette" className="h-5 w-5 text-brand" />
            {t("wizard.brandingTitle")}
          </CardTitle>
          <CardDescription>{t("wizard.brandingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("wizard.chatbotDisplayName")}</Label>
              <Input placeholder={t("wizard.chatbotDisplayNamePlaceholder")} value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("wizard.welcomeMessage")}</Label>
              <Input placeholder={t("wizard.welcomeMessagePlaceholder")} value={editWelcomeMsg} onChange={e => setEditWelcomeMsg(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("wizard.primaryColor")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 appearance-none" />
                <Input value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("wizard.headerColor")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editHeaderColor} onChange={e => setEditHeaderColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                <Input value={editHeaderColor} onChange={e => setEditHeaderColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("wizard.userBubble")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editUserBubble} onChange={e => setEditUserBubble(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                <Input value={editUserBubble} onChange={e => setEditUserBubble(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("wizard.botBubble")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editBotBubble} onChange={e => setEditBotBubble(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                <Input value={editBotBubble} onChange={e => setEditBotBubble(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.userTextColor")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editUserTextColor} onChange={e => setEditUserTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                <Input value={editUserTextColor} onChange={e => setEditUserTextColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.botTextColor")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editBotTextColor} onChange={e => setEditBotTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                <Input value={editBotTextColor} onChange={e => setEditBotTextColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 p-4 bg-muted/30 rounded-xl border border-border/50">
              <Label className="block mb-2">{t("wizard.logoUpload")}</Label>
              <div className="flex items-center gap-4">
                {(editLogoPreview || editLogoUrl) && (
                  <div className="bg-white p-2 rounded-lg border shadow-sm">
                    <img src={editLogoPreview || editLogoUrl} alt={t("workspace.chatbotName")} className="w-12 h-12 rounded object-contain" />
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium hover-lift">
                  <AppIcon name="Upload" className="h-4 w-4" />
                  {editLogoFile ? editLogoFile.name : (editLogoUrl ? t("logo.change") : t("wizard.logoUpload"))}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditLogoFile(file);
                        setEditLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                {(editLogoFile || editLogoUrl) && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditLogoFile(null); setEditLogoPreview(null); setEditLogoUrl(""); }}>
                    <AppIcon name="X" className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t("settings.footerLinks")}</Label>
                  <p className="text-xs text-muted-foreground">{t("settings.footerLinksDesc")}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFooterLinks([...editFooterLinks, { label: "", url: "" }])}
                  disabled={editFooterLinks.length >= 4}
                >
                  <AppIcon name="Plus" className="h-4 w-4 mr-2" />
                  {t("settings.addLink")}
                </Button>
              </div>
              
              {editFooterLinks.length > 0 ? (
                <div className="space-y-3">
                  {editFooterLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-left-4 fade-in duration-300">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder={t("settings.linkLabelPlaceholder")}
                          value={link.label}
                          onChange={(e) => {
                            const newLinks = [...editFooterLinks];
                            newLinks[idx].label = e.target.value;
                            setEditFooterLinks(newLinks);
                          }}
                        />
                      </div>
                      <div className="flex-[2] space-y-2">
                        <Input
                          placeholder={t("settings.linkUrlPlaceholder")}
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...editFooterLinks];
                            newLinks[idx].url = e.target.value;
                            setEditFooterLinks(newLinks);
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        onClick={() => {
                          const newLinks = [...editFooterLinks];
                          newLinks.splice(idx, 1);
                          setEditFooterLinks(newLinks);
                        }}
                      >
                        <AppIcon name="Trash2" className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-muted/50 border-dashed">
                  {t("settings.noFooterLinks")}
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t">
            <Button onClick={handleSaveBranding} disabled={brandingSaving} className="w-full sm:w-auto hover-lift">
              {brandingSaving ? (
                <>
                  <AppIcon name="Loader2" className="mr-2 h-4 w-4 animate-spin-slow" />
                  {t("settings.saving")}
                </>
              ) : (
                <>
                  <AppIcon name="Save" className="mr-2 h-4 w-4" />
                  {t("common.save")}
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
