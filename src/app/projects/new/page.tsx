"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AppIcon } from "@/components/ui/app-icon";
import { FileUploadArea } from "@/components/upload-train/file-upload-area";
import { UrlUploadInput } from "@/components/upload-train/url-upload-input";
import { useCreateProject, useUploadDocument } from "@/lib/api/hooks";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ValidatedFile {
    id: string;
    file: File;
    status: "pending" | "validating" | "ready" | "error";
    validationErrors: string[];
    metadata: { name: string; size: number; type: string; detectedType?: string; };
}

interface ValidatedUrl {
    id: string;
    url: string;
    status: "pending" | "validating" | "ready" | "error";
    validationErrors: string[];
    metadata?: { title?: string; contentType?: string; size?: number; lastModified?: string; };
}

interface SuggestedMessage {
    label: string;
    prompt: string;
}

interface SortableSuggestedMsgProps {
    id: string;
    sm: SuggestedMessage;
    onEdit: () => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}

function SortableSuggestedMsg({ id, sm, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: SortableSuggestedMsgProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };
    
    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-3 rounded-lg border bg-muted/20 ${isDragging ? 'border-brand shadow-md shadow-brand/10 opacity-70' : 'border-border/60 hover:border-border transition-colors'}`}>
            <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none shrink-0">
                <AppIcon name="GripVertical" className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sm.label}</p>
                <p className="text-xs text-muted-foreground truncate">{sm.prompt}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
                <div className="flex flex-col mr-1 border-r border-border/60 pr-2">
                    <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                        <AppIcon name="ChevronUp" className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={onMoveDown} disabled={isLast} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                        <AppIcon name="ChevronDown" className="h-3 w-3" />
                    </button>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                    <AppIcon name="Edit" className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                    <AppIcon name="Trash2" className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

const TOTAL_STEPS = 5;

export default function NewProjectWizard() {
    const router = useRouter();
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Step 1 State
    const [projectName, setProjectName] = useState("");
    const createProjectMutation = useCreateProject();

    // Step 2: Bot Configuration (Context Message + Suggested Messages)
    const [contextMessage, setContextMessage] = useState("");
    const [suggestedMessages, setSuggestedMessages] = useState<SuggestedMessage[]>([]);
    const [newSugLabel, setNewSugLabel] = useState("");
    const [newSugPrompt, setNewSugPrompt] = useState("");

    // Step 3: Sources
    const [files, setFiles] = useState<ValidatedFile[]>([]);
    const [urls, setUrls] = useState<ValidatedUrl[]>([]);
    const uploadDocumentMutation = useUploadDocument();
    const [isUploading, setIsUploading] = useState(false);

    // Step 4: Branding
    const [primaryColor, setPrimaryColor] = useState("#6366f1");
    const [userBubbleColor, setUserBubbleColor] = useState("#6366f1");
    const [botBubbleColor, setBotBubbleColor] = useState("#f1f5f9");
    const [userTextColor, setUserTextColor] = useState("#ffffff");
    const [botTextColor, setBotTextColor] = useState("#1e293b");
    const [headerColor, setHeaderColor] = useState("#ffffff");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [chatbotDisplayName, setChatbotDisplayName] = useState("");
    const [welcomeMessage, setWelcomeMessage] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setSuggestedMessages((items) => {
                const oldIndex = items.findIndex((item) => (item.label + item.prompt) === active.id);
                const newIndex = items.findIndex((item) => (item.label + item.prompt) === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const moveMsg = (index: number, direction: 'up' | 'down') => {
        setSuggestedMessages((items) => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= items.length) return items;
            return arrayMove(items, index, newIndex);
        });
    };

    const handleCreateProject = async () => {
        if (!projectName.trim()) {
            toast({ title: t("wizard.namePlaceholder"), variant: "destructive" });
            return;
        }
        try {
            const res = await createProjectMutation.mutateAsync({ name: projectName.trim() });
            setProjectId(res.id);
            setStep(2);
        } catch (error) {
            // Handled by mutation hook
        }
    };

    const handleSaveBotConfig = async () => {
        if (projectId) {
            try {
                await fetch(`/api/projects/${projectId}/bot-config`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contextMessage: contextMessage.trim() || null,
                        modules: suggestedMessages,
                    }),
                });
            } catch { /* optional save failure, user can update later */ }
        }
        setStep(3);
    };

    const handleUploadSources = async () => {
        const readyFiles = files.filter(f => f.status === "ready");
        const readyUrls = urls.filter(u => u.status === "ready");

        if (readyFiles.length === 0 && readyUrls.length === 0) {
            setStep(4);
            return;
        }

        setIsUploading(true);
        let successCount = 0;

        try {
            for (const f of readyFiles) {
                await uploadDocumentMutation.mutateAsync({ projectId: projectId!, file: f.file });
                successCount++;
            }
            for (const u of readyUrls) {
                await uploadDocumentMutation.mutateAsync({ projectId: projectId!, url: u.url });
                successCount++;
            }
            toast({ title: "Upload complete", description: `Successfully processed ${successCount} sources.` });
            setStep(4);
        } catch (error) {
            toast({ title: "Upload incomplete", description: "Some sources failed to upload.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveBranding = async () => {
        if (projectId) {
            try {
                // Upload logo file first if present
                let uploadedLogoUrl: string | undefined;
                if (logoFile) {
                    const formData = new FormData();
                    formData.append("logo", logoFile);
                    const uploadRes = await fetch(`/api/projects/${projectId}/logo/upload`, {
                        method: "POST",
                        body: formData,
                    });
                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        uploadedLogoUrl = uploadData.logoUrl;
                    }
                }

                await fetch(`/api/projects/${projectId}/branding`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        primaryColor,
                        userBubbleColor,
                        botBubbleColor,
                        userTextColor,
                        botTextColor,
                        headerColor,
                        logoUrl: uploadedLogoUrl || undefined,
                        chatbotDisplayName: chatbotDisplayName || undefined,
                        welcomeMessage: welcomeMessage || undefined,
                    }),
                });
            } catch { /* optional */ }
        }
        setStep(5);
    };

    const addSuggestion = () => {
        if (!newSugLabel.trim() || !newSugPrompt.trim()) return;
        setSuggestedMessages(prev => [...prev, { label: newSugLabel.trim(), prompt: newSugPrompt.trim() }]);
        setNewSugLabel("");
        setNewSugPrompt("");
    };

    const removeSuggestion = (idx: number) => {
        setSuggestedMessages(prev => prev.filter((_, i) => i !== idx));
    };

    const stepLabels = [t("wizard.stepName"), "Configure", t("wizard.stepSources"), t("wizard.stepBranding"), t("wizard.stepLaunch")];

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto w-full pt-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Wizard Header & Progress */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-6">
                        {t("wizard.createTitle")}
                    </h1>
                    <div className="flex items-center justify-center max-w-xl mx-auto relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-border/60 -z-10"></div>
                        <div className="flex justify-between w-full">
                            {stepLabels.map((label, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 bg-background px-1.5 relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${step >= i + 1 ? "bg-brand border-brand text-white" : "bg-card border-border text-muted-foreground"}`}>
                                        {i + 1}
                                    </div>
                                    <span className={`text-[11px] font-medium ${step >= i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step 1: Name */}
                {step === 1 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                        <CardContent className="p-8 pt-8 flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6">
                                <AppIcon name="Bot" className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">{t("wizard.nameTitle")}</h2>
                            <p className="text-muted-foreground text-sm mb-8 max-w-sm">{t("wizard.nameDesc")}</p>
                            <div className="w-full max-w-md space-y-4">
                                <Input
                                    placeholder={t("wizard.namePlaceholder")}
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
                                    className="h-12 bg-background text-base"
                                    autoFocus
                                />
                                <Button
                                    onClick={handleCreateProject}
                                    disabled={createProjectMutation.isPending || !projectName.trim()}
                                    className="w-full h-12 text-base font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
                                >
                                    {createProjectMutation.isPending ? t("wizard.creating") : t("wizard.createContinue")}
                                    {!createProjectMutation.isPending && <AppIcon name="ArrowRight" className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Bot Configuration */}
                {step === 2 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-right-8 duration-300">
                        <CardContent className="p-6 sm:p-8 pt-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Configure Your Bot</h2>
                                    <p className="text-muted-foreground text-sm">Set a context message and suggested quick actions for your users</p>
                                </div>
                                <Button variant="ghost" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setStep(3)}>
                                    {t("common.skip")}
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {/* Context Message */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <AppIcon name="MessageCircle" className="h-4 w-4 text-brand" />
                                        Context Message
                                    </Label>
                                    <Textarea
                                        placeholder='e.g. "This chatbot serves customers of Acme Corp, a SaaS platform for project management. Users may ask about pricing, features, and troubleshooting."'
                                        value={contextMessage}
                                        onChange={(e) => setContextMessage(e.target.value)}
                                        rows={3}
                                        className="resize-y"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This context is automatically appended to every user query, making even vague questions more useful.
                                    </p>
                                </div>

                                {/* Divider */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60"></span></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">suggested messages</span></div>
                                </div>

                                {/* Suggested Messages List */}
                                {suggestedMessages.length > 0 && (
                                    <div className="space-y-2">
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                            <SortableContext items={suggestedMessages.map(sm => sm.label + sm.prompt)} strategy={verticalListSortingStrategy}>
                                                {suggestedMessages.map((sm, i) => (
                                                    <SortableSuggestedMsg
                                                        key={sm.label + sm.prompt}
                                                        id={sm.label + sm.prompt}
                                                        sm={sm}
                                                        isFirst={i === 0}
                                                        isLast={i === suggestedMessages.length - 1}
                                                        onMoveUp={() => moveMsg(i, 'up')}
                                                        onMoveDown={() => moveMsg(i, 'down')}
                                                        onEdit={() => {
                                                            setNewSugLabel(sm.label);
                                                            setNewSugPrompt(sm.prompt);
                                                            removeSuggestion(i);
                                                        }}
                                                        onDelete={() => removeSuggestion(i)}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    </div>
                                )}

                                {/* Add Suggestion */}
                                <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-border/60 bg-muted/5 transition-colors focus-within:border-brand focus-within:bg-brand/5">
                                    <Input
                                        placeholder="Button label (e.g. 'How do I get started?')"
                                        value={newSugLabel}
                                        onChange={e => setNewSugLabel(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                    <Input
                                        placeholder="Full prompt (e.g. 'Walk me through the onboarding process step by step')"
                                        value={newSugPrompt}
                                        onChange={e => setNewSugPrompt(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") addSuggestion(); }}
                                        className="h-9 text-sm"
                                    />
                                    <Button variant="outline" size="sm" onClick={addSuggestion} disabled={!newSugLabel.trim() || !newSugPrompt.trim()} className="self-start">
                                        <AppIcon name="Plus" className="h-3.5 w-3.5 mr-1" />
                                        Add Suggestion
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    These appear as clickable buttons after the welcome message and after each bot reply, helping users navigate.
                                </p>

                                <div className="pt-4 flex justify-between items-center w-full">
                                    <Button variant="ghost" onClick={() => setStep(1)} className="h-11 px-6 font-medium">
                                        <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                                        {t("common.back")}
                                    </Button>
                                    <Button onClick={handleSaveBotConfig} className="h-11 px-8 font-medium bg-brand hover:bg-brand-hover text-white">
                                        {t("common.next")}
                                        <AppIcon name="ArrowRight" className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Sources */}
                {step === 3 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-right-8 duration-300">
                        <CardContent className="p-6 sm:p-8 pt-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t("wizard.sourcesTitle")}</h2>
                                    <p className="text-muted-foreground text-sm">{t("wizard.sourcesDesc")}</p>
                                </div>
                                <Button variant="ghost" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setStep(4)}>
                                    {t("common.skip")}
                                </Button>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50">
                                    <FileUploadArea files={files} onFilesChange={setFiles} disabled={isUploading} />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60"></span></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">and / or</span></div>
                                </div>

                                <div className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50">
                                    <UrlUploadInput urls={urls} onUrlsChange={setUrls} disabled={isUploading} />
                                </div>

                                <div className="pt-4 flex justify-between items-center w-full">
                                    <Button variant="ghost" onClick={() => setStep(2)} className="h-11 px-6 font-medium">
                                        <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                                        {t("common.back")}
                                    </Button>
                                    <Button
                                        onClick={handleUploadSources}
                                        disabled={isUploading || (files.length === 0 && urls.length === 0)}
                                        className="h-11 px-8 font-medium bg-brand hover:bg-brand-hover text-white transition-all shadow-md hover:shadow-lg"
                                    >
                                        {isUploading ? (
                                            <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow mr-2" />{t("wizard.processing")}</>
                                        ) : (
                                            <>{t("wizard.uploadTrain")}<AppIcon name="Sparkles" className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Branding */}
                {step === 4 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-right-8 duration-300">
                        <CardContent className="p-6 sm:p-8 pt-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t("wizard.brandingTitle")}</h2>
                                    <p className="text-muted-foreground text-sm">{t("wizard.brandingDesc")}</p>
                                </div>
                                <Button variant="ghost" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setStep(5)}>
                                    {t("common.skip")}
                                </Button>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t("wizard.chatbotDisplayName")}</Label>
                                    <Input placeholder={t("wizard.chatbotDisplayNamePlaceholder")} value={chatbotDisplayName} onChange={e => setChatbotDisplayName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("wizard.welcomeMessage")}</Label>
                                    <Input placeholder={t("wizard.welcomeMessagePlaceholder")} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("wizard.primaryColor")}</Label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                        <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("wizard.headerColor")}</Label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                        <Input value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("wizard.userBubble")}</Label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={userBubbleColor} onChange={e => setUserBubbleColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                        <Input value={userBubbleColor} onChange={e => setUserBubbleColor(e.target.value)} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("wizard.botBubble")}</Label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={botBubbleColor} onChange={e => setBotBubbleColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                        <Input value={botBubbleColor} onChange={e => setBotBubbleColor(e.target.value)} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>User Text Color</Label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={userTextColor} onChange={e => setUserTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                        <Input value={userTextColor} onChange={e => setUserTextColor(e.target.value)} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bot Text Color</Label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={botTextColor} onChange={e => setBotTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                        <Input value={botTextColor} onChange={e => setBotTextColor(e.target.value)} className="font-mono text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>{t("wizard.logoUpload")}</Label>
                                    <div className="flex items-center gap-4">
                                        {logoPreview && (
                                            <img src={logoPreview} alt="Logo preview" className="w-12 h-12 rounded-lg object-contain border border-border" />
                                        )}
                                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium">
                                            <AppIcon name="Upload" className="h-4 w-4" />
                                            {logoFile ? logoFile.name : t("wizard.logoUpload")}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setLogoFile(file);
                                                        setLogoPreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </label>
                                        {logoFile && (
                                            <Button variant="ghost" size="sm" onClick={() => { setLogoFile(null); setLogoPreview(null); }}>
                                                <AppIcon name="X" className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Live preview */}
                            <div className="mt-8 p-4 border border-border/50 rounded-xl bg-muted/30">
                                <p className="text-xs text-muted-foreground mb-3 font-medium">{t("wizard.brandingPreview")}</p>
                                {/* Header preview */}
                                <div className="rounded-t-lg px-4 py-3 flex items-center gap-2 border border-b-0 border-border/30" style={{ backgroundColor: headerColor }}>
                                    {logoPreview && <img src={logoPreview} alt="Logo" className="w-6 h-6 rounded object-contain" />}
                                    <span className="text-sm font-semibold" style={{ color: headerColor !== '#ffffff' && headerColor !== '#fff' ? '#fff' : '#1e293b' }}>{chatbotDisplayName || projectName || 'Chatbot'}</span>
                                </div>
                                <div className="space-y-2 p-3 border border-t-0 border-border/30 rounded-b-lg">
                                    <div className="flex justify-end">
                                        <div className="rounded-2xl rounded-br-md px-4 py-2 text-sm" style={{ backgroundColor: userBubbleColor, color: userTextColor }}>
                                            Hello!
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="rounded-2xl rounded-bl-md px-4 py-2 text-sm" style={{ backgroundColor: botBubbleColor, color: botTextColor }}>
                                            {welcomeMessage || 'Hi there! How can I help you today?'}
                                        </div>
                                    </div>
                                    {suggestedMessages.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {suggestedMessages.slice(0, 3).map((sm, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border border-border/60 bg-background text-foreground">
                                                    <AppIcon name="Sparkles" className="h-2.5 w-2.5" />
                                                    {sm.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 flex justify-between items-center w-full">
                                <Button variant="ghost" onClick={() => setStep(3)} className="h-11 px-6 font-medium">
                                    <AppIcon name="ArrowLeft" className="mr-2 h-4 w-4" />
                                    {t("common.back")}
                                </Button>
                                <Button onClick={handleSaveBranding} className="h-11 px-8 font-medium bg-brand hover:bg-brand-hover text-white">
                                    {t("common.next")}
                                    <AppIcon name="ArrowRight" className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 5: Launch */}
                {step === 5 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500 text-center overflow-hidden">
                        <div className="h-2 bg-success w-full" />
                        <CardContent className="p-8 md:p-12 pt-10 flex flex-col items-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-success/20 animate-pulse rounded-full blur-xl scale-150"></div>
                                <div className="h-20 w-20 bg-success/10 text-success rounded-full flex items-center justify-center relative border border-success/20">
                                    <AppIcon name="CheckCircle2" className="h-10 w-10" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold mb-3 tracking-tight text-foreground">{t("wizard.readyTitle")}</h2>
                            <p className="text-muted-foreground mb-10 max-w-md leading-relaxed text-[15px]">{t("wizard.readyDesc")}</p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                <Button asChild variant="outline" className="flex-1 h-12 text-base shadow-sm border-border/60">
                                    <Link href="/projects">{t("wizard.backDashboard")}</Link>
                                </Button>
                                <Button asChild className="flex-1 h-12 text-base font-medium shadow-md bg-brand hover:bg-brand-hover text-white">
                                    <Link href={`/projects/${projectId}`}>
                                        <AppIcon name="MessageSquare" className="mr-2 h-4 w-4" />
                                        {t("wizard.testNow")}
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
