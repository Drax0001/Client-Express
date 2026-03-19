"use client";

import { useState, useEffect } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useUsage } from "@/lib/api/hooks";
import { UpgradeModal } from "@/components/projects/upgrade-modal";
import { Textarea } from "@/components/ui/textarea";

interface CustomizeTabProps {
  projectId: string;
  project: any;
  refetch: () => void;
}

export function CustomizeTab({ projectId, project, refetch }: CustomizeTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: usageData } = useUsage();

  const [editPrimaryColor, setEditPrimaryColor] = useState("");
  const [editUserBubble, setEditUserBubble] = useState("");
  const [editBotBubble, setEditBotBubble] = useState("");
  const [editHeaderColor, setEditHeaderColor] = useState("");
  const [editUserTextColor, setEditUserTextColor] = useState("");
  const [editBotTextColor, setEditBotTextColor] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editWelcomeMsg, setEditWelcomeMsg] = useState("");

  // New Feature 8 fields
  const [editTheme, setEditTheme] = useState<"light" | "dark" | "auto">("light");
  const [editShowBranding, setEditShowBranding] = useState(true);
  const [editSuggestedMessages, setEditSuggestedMessages] = useState<string[]>([]);
  const [editFooterLinks, setEditFooterLinks] = useState<{label: string, url: string}[]>([]);

  const [brandingSaving, setBrandingSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (project?.branding) {
      const b = project.branding as any;
      setEditPrimaryColor(b.primaryColor || "#8B5CF6");
      setEditUserBubble(b.userBubbleColor || "#8B5CF6");
      setEditBotBubble(b.botBubbleColor || "#F8FAFC");
      setEditHeaderColor(b.headerColor || "#ffffff");
      setEditUserTextColor(b.userTextColor || "#ffffff");
      setEditBotTextColor(b.botTextColor || "#0F172A");
      setEditLogoUrl(b.logoUrl || "");
      setEditDisplayName(b.chatbotDisplayName || "");
      setEditWelcomeMsg(b.welcomeMessage || "");

      setEditTheme(b.theme || "light");
      setEditShowBranding(b.showBranding ?? true);
      setEditSuggestedMessages(b.suggestedMessages || []);
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
          theme: editTheme,
          showBranding: editShowBranding,
          suggestedMessages: editSuggestedMessages.length > 0 ? editSuggestedMessages : undefined,
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

  const addSuggestedMessage = () => {
    if (editSuggestedMessages.length >= 4) return;
    setEditSuggestedMessages([...editSuggestedMessages, ""]);
  };

  const updateSuggestedMessage = (index: number, val: string) => {
    const nextMsg = [...editSuggestedMessages];
    nextMsg[index] = val;
    setEditSuggestedMessages(nextMsg);
  };

  const removeSuggestedMessage = (index: number) => {
    const nextMsg = [...editSuggestedMessages];
    nextMsg.splice(index, 1);
    setEditSuggestedMessages(nextMsg);
  };

  const addFooterLink = () => {
    if (editFooterLinks.length >= 3) return;
    setEditFooterLinks([...editFooterLinks, { label: "", url: "" }]);
  };

  const updateFooterLink = (index: number, field: "label" | "url", value: string) => {
    const nextLinks = [...editFooterLinks];
    nextLinks[index] = { ...nextLinks[index], [field]: value };
    setEditFooterLinks(nextLinks);
  };

  const removeFooterLink = (index: number) => {
    const nextLinks = [...editFooterLinks];
    nextLinks.splice(index, 1);
    setEditFooterLinks(nextLinks);
  };

  const handleToggleBranding = () => {
    if (usageData && usageData.plan !== "BUSINESS") {
      setShowUpgradeModal(true);
      return;
    }
    setEditShowBranding(!editShowBranding);
  };

  const isDark = editTheme === "dark"; // auto is hard to preview, default to light for preview if auto

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto h-full overflow-hidden pb-6 animate-in fade-in duration-300">

      {/* LEFT PANE: FORM */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6 custom-scrollbar">

        {/* Basic Info */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>{t("wizard.brandingTitle") || "Customize Appearance"}</CardTitle>
            <CardDescription>{t("wizard.brandingDesc") || "Set your chatbot's visual identity."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("wizard.chatbotDisplayName")}</Label>
                <Input placeholder={t("wizard.chatbotDisplayNamePlaceholder")} value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("wizard.welcomeMessage")}</Label>
                <Textarea placeholder={t("wizard.welcomeMessagePlaceholder")} value={editWelcomeMsg} onChange={e => setEditWelcomeMsg(e.target.value)} rows={3} />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-border/60">
              <div className="space-y-2">
                <Label>{t("wizard.primaryColor")}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 appearance-none bg-transparent" />
                  <Input value={editPrimaryColor} onChange={e => setEditPrimaryColor(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("wizard.headerColor")}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editHeaderColor} onChange={e => setEditHeaderColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 bg-transparent" />
                  <Input value={editHeaderColor} onChange={e => setEditHeaderColor(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("wizard.userBubble")}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editUserBubble} onChange={e => setEditUserBubble(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 bg-transparent" />
                  <Input value={editUserBubble} onChange={e => setEditUserBubble(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.userTextColor")}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editUserTextColor} onChange={e => setEditUserTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 bg-transparent" />
                  <Input value={editUserTextColor} onChange={e => setEditUserTextColor(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("wizard.botBubble")}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editBotBubble} onChange={e => setEditBotBubble(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 bg-transparent" />
                  <Input value={editBotBubble} onChange={e => setEditBotBubble(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.botTextColor")}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editBotTextColor} onChange={e => setEditBotTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0 bg-transparent" />
                  <Input value={editBotTextColor} onChange={e => setEditBotTextColor(e.target.value)} className="font-mono text-sm uppercase" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border/60">
              <Label className="block mb-2">{t("wizard.logoUpload")}</Label>
              <div className="flex items-center gap-4">
                {(editLogoPreview || editLogoUrl) && (
                  <div className="bg-white p-2 rounded-lg border shadow-sm">
                    <img src={editLogoPreview || editLogoUrl} alt="Logo" className="w-12 h-12 rounded object-contain" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditLogoFile(file);
                        setEditLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-full text-center">{t("wizard.logoOrUrl")}</span>
                  </div>
                  <Input placeholder="https://example.com/logo.png" value={editLogoUrl} onChange={e => { setEditLogoUrl(e.target.value); setEditLogoFile(null); setEditLogoPreview(null); }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature 8: Display & Suggested Messages */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Display & Interaction</CardTitle>
            <CardDescription>Configure suggested queries and widget theme.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Widget Theme</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={editTheme === "light"} onChange={() => setEditTheme("light")} className="accent-brand" /> Light
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={editTheme === "dark"} onChange={() => setEditTheme("dark")} className="accent-brand" /> Dark
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={editTheme === "auto"} onChange={() => setEditTheme("auto")} className="accent-brand" /> Auto (OS)
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label>Suggested Messages</Label>
                <div className="text-xs text-muted-foreground">{editSuggestedMessages.length} / 4</div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Provide quick prompts for the user to select at the start of the chat.</p>
              {editSuggestedMessages.map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={msg} onChange={e => updateSuggestedMessage(i, e.target.value)} placeholder="e.g. How does pricing work?" />
                  <Button variant="ghost" size="sm" onClick={() => removeSuggestedMessage(i)} className="text-muted-foreground hover:text-destructive">
                    <AppIcon name="Trash2" className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {editSuggestedMessages.length < 4 && (
                <Button variant="outline" size="sm" onClick={addSuggestedMessage} className="w-full border-dashed">
                  <AppIcon name="Plus" className="mr-2 h-4 w-4" /> Add Suggestion
                </Button>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label>Footer Links</Label>
                <div className="text-xs text-muted-foreground">{editFooterLinks.length} / 3</div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Add external links (like Privacy Policy or Terms) to the bottom of the widget.</p>
              {editFooterLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input value={link.label} onChange={e => updateFooterLink(i, "label", e.target.value)} placeholder="Link Label (e.g. Terms)" className="h-8" />
                    <Input value={link.url} onChange={e => updateFooterLink(i, "url", e.target.value)} placeholder="URL (e.g. https://...)" className="h-8" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFooterLink(i)} className="text-muted-foreground hover:text-destructive h-8 px-2">
                    <AppIcon name="Trash2" className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {editFooterLinks.length < 3 && (
                <Button variant="outline" size="sm" onClick={addFooterLink} className="w-full border-dashed">
                  <AppIcon name="Plus" className="mr-2 h-4 w-4" /> Add Link
                </Button>
              )}
            </div>

            <div className="flex justify-between items-center p-4 border border-border/50 rounded-xl bg-background/50 pt-4 mt-4">
              <div>
                <p className="text-sm font-medium">Show "Powered by ClientExpress"</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requires Business plan.
                </p>
              </div>
              <button
                role="switch"
                onClick={handleToggleBranding}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${editShowBranding ? "bg-brand" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editShowBranding ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4 pb-8">
          <Button onClick={handleSaveBranding} disabled={brandingSaving} className="w-full sm:w-auto px-8 py-5">
            {brandingSaving ? (
              <><AppIcon name="Loader2" className="mr-2 h-4 w-4 animate-spin-slow" /> Saving...</>
            ) : (
              <><AppIcon name="Save" className="mr-2 h-4 w-4" /> Save Customization</>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT PANE: LIVE PREVIEW */}
      <div className="hidden lg:flex w-[380px] shrink-0 sticky top-0 md:h-[650px] border border-border/60 rounded-[2rem] shadow-xl overflow-hidden flex-col bg-background relative isolate">

        {/* Fake Widget Header */}
        <div
          className="flex items-center gap-3 p-4 shrink-0 shadow-sm z-10"
          style={{ backgroundColor: editHeaderColor || editPrimaryColor, color: "#fff" }}
        >
          {editLogoUrl || editLogoPreview ? (
            <div className="h-8 w-8 rounded-full bg-white p-1 overflow-hidden shadow-sm flex items-center justify-center shrink-0">
              <img src={editLogoPreview || editLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-white p-1.5 flex flex-col justify-center items-center shrink-0 text-black">
              <AppIcon name="Bot" className="w-full text-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0 font-medium truncate">
            {editDisplayName || project.name}
          </div>
          <div className="shrink-0 flex gap-2 opacity-80">
            <AppIcon name="RotateCcw" className="h-4 w-4" />
            <AppIcon name="X" className="h-5 w-5" />
          </div>
        </div>

        {/* Fake Chat Area */}
        <div className={`flex-1 overflow-hidden flex flex-col p-4 gap-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

          {/* Assistant Welcome */}
          <div className="flex gap-2 w-full pr-10">
            <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center align-top mt-1" style={{ backgroundColor: editPrimaryColor }}>
              <AppIcon name="Bot" className="h-3 w-3 text-white" />
            </div>
            <div
              className="p-3 rounded-2xl rounded-tl-sm text-sm"
              style={{ backgroundColor: editBotBubble, color: editBotTextColor }}
            >
              {editWelcomeMsg || "Hi there! How can I help you today?"}
            </div>
          </div>

          {/* User Message */}
          <div className="flex gap-2 w-full justify-end pl-10">
            <div
              className="p-3 rounded-2xl rounded-tr-sm text-sm break-words shadow-sm"
              style={{ backgroundColor: editUserBubble, color: editUserTextColor }}
            >
              What are your opening hours?
            </div>
          </div>

          {/* Suggestions */}
          {editSuggestedMessages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pb-4">
              {editSuggestedMessages.map((msg, i) => msg && (
                <div
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full border shadow-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                  style={{ borderColor: editPrimaryColor, color: editPrimaryColor, backgroundColor: isDark ? 'transparent' : '#fff' }}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fake Input Area */}
        <div className={`p-3 shrink-0 border-t ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="relative">
            <div className={`w-full text-sm p-3 pr-10 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-transparent text-slate-500'}`}>
              Type your message...
            </div>
            <div className="absolute right-2 top-2 h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: editPrimaryColor }}>
              <AppIcon name="Send" className="h-4 w-4 text-white" />
            </div>
          </div>

          {editShowBranding !== false && (
            <div className={`text-[10px] text-center mt-2 flex flex-col items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <div>Powered by <strong>Client Express</strong></div>
            </div>
          )}

          {editFooterLinks.length > 0 && (
            <div className={`mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {editFooterLinks.map((link: any, i: number) => (
                    <span key={i} className="truncate max-w-[100px] hover:underline cursor-pointer">{link.label || "Link"}</span>
                ))}
            </div>
          )}
        </div>

      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        title="Remove Branding"
        description="Removing the 'Powered by Client Express' watermark requires a Business plan. Upgrade your workspace to unlock professional branding."
        requiredPlan="BUSINESS"
      />
    </div>
  );
}
