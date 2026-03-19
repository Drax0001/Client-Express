"use client";

import { useState, useEffect, useCallback } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/lib/i18n";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableSuggestedMsgProps {
    id: string;
    sm: SuggestedMsg;
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

interface ModelDefinition {
    id: string;
    name: string;
    description: string;
    tier: "FREE" | "PRO" | "BUSINESS";
    maxTokens: number;
    contextWindow: string;
    released: string;
    preview: boolean;
}

interface SuggestedMsg {
    label: string;
    prompt: string;
}

interface BotConfig {
    modelId: string;
    systemPrompt: string | null;
    temperature: number;
    maxTokens: number;
    persona: string | null;
    instructions: string | null;
    responseStyle: string;
    contextMessage: string | null;
    modules: SuggestedMsg[] | null;
    availableModels: ModelDefinition[];
    userPlan: "FREE" | "PRO" | "BUSINESS";
}

interface BotSettingsPanelProps {
    projectId: string;
}

export function BotSettingsPanel({ projectId }: BotSettingsPanelProps) {
    const { t } = useTranslation();
    const [config, setConfig] = useState<BotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userPlan, setUserPlan] = useState<"FREE" | "PRO" | "BUSINESS">("FREE");

    // Form state
    const [modelId, setModelId] = useState("gemini-2.5-flash");
    const [persona, setPersona] = useState("");
    const [instructions, setInstructions] = useState("");
    const [systemPrompt, setSystemPrompt] = useState("");
    const [temperature, setTemperature] = useState(0.4);
    const [maxTokens, setMaxTokens] = useState(5000);
    const [responseStyle, setResponseStyle] = useState("balanced");
    const [contextMessage, setContextMessage] = useState("");
    const [suggestedMsgs, setSuggestedMsgs] = useState<SuggestedMsg[]>([]);
    const [newSugLabel, setNewSugLabel] = useState("");
    const [newSugPrompt, setNewSugPrompt] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setSuggestedMsgs((items) => {
                const oldIndex = items.findIndex((item) => (item.label + item.prompt) === active.id);
                const newIndex = items.findIndex((item) => (item.label + item.prompt) === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const moveMsg = (index: number, direction: 'up' | 'down') => {
        setSuggestedMsgs((items) => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= items.length) return items;
            return arrayMove(items, index, newIndex);
        });
    };

    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/projects/${projectId}/bot-config`);
            if (!res.ok) throw new Error("Failed to load config");
            const data: BotConfig = await res.json();
            setConfig(data);
            setUserPlan(data.userPlan || "FREE");
            setModelId(data.modelId);
            setPersona(data.persona || "");
            setInstructions(data.instructions || "");
            setSystemPrompt(data.systemPrompt || "");
            setTemperature(data.temperature);
            setMaxTokens(data.maxTokens);
            setResponseStyle(data.responseStyle);
            setContextMessage(data.contextMessage || "");
            setSuggestedMsgs(Array.isArray(data.modules) ? data.modules : []);
        } catch (err) {
            setError(t("dashboard.failedLoad") || "Failed to load bot configuration");
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/bot-config`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modelId,
                    persona: persona.trim() || null,
                    instructions: instructions.trim() || null,
                    systemPrompt: systemPrompt.trim() || null,
                    temperature,
                    maxTokens,
                    responseStyle,
                    contextMessage: contextMessage.trim() || null,
                    modules: suggestedMsgs,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err: any) {
            setError(err.message || t("settings.saveFailed") || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
        );
    }

    const models = config?.availableModels || [];
    const tierRank: Record<string, number> = { FREE: 0, PRO: 1, BUSINESS: 2 };
    const userRank = tierRank[userPlan] ?? 0;

    return (
        <div className="space-y-6 max-w-3xl pb-10 animate-in fade-in duration-300">
            {error && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20">
                    {error}
                </div>
            )}

            {/* Model Selection */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AppIcon name="Cpu" className="h-5 w-5 text-brand" />
                        {t("bot.aiModel")}
                    </CardTitle>
                    <CardDescription>
                        {t("bot.aiModelDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3">
                        {models.map((model) => {
                            const modelRank = tierRank[model.tier] ?? 0;
                            const isLocked = modelRank > userRank;
                            return (
                                <button
                                    key={model.id}
                                    onClick={() => !isLocked && setModelId(model.id)}
                                    disabled={isLocked}
                                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                                        isLocked
                                            ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                                            : modelId === model.id
                                                ? "border-brand bg-brand/5 shadow-sm"
                                                : "border-border/60 hover:border-border hover:bg-muted/30"
                                    }`}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                        isLocked
                                            ? "border-muted-foreground/20"
                                            : modelId === model.id ? "border-brand" : "border-muted-foreground/40"
                                    }`}>
                                        {!isLocked && modelId === model.id && (
                                            <div className="w-2 h-2 rounded-full bg-brand" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm">{model.name}</span>
                                            {isLocked && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                                                    <AppIcon name="Lock" className="h-2.5 w-2.5" />
                                                    {model.tier}
                                                </Badge>
                                            )}
                                            {model.preview && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                    Preview
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                                {model.contextWindow} context
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{model.description}</p>
                                        {isLocked && (
                                            <p className="text-[11px] text-brand mt-1">
                                                Upgrade to {model.tier} to unlock this model
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Persona & Instructions */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AppIcon name="User" className="h-5 w-5 text-brand" />
                        {t("bot.personalityTitle")}
                    </CardTitle>
                    <CardDescription>
                        {t("bot.personalityDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t("bot.personaLabel")}</Label>
                        <Input
                            placeholder={t("bot.personaPlaceholder")}
                            value={persona}
                            onChange={(e) => setPersona(e.target.value)}
                            className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("bot.personaDesc")}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t("bot.instructionsLabel")}</Label>
                        <Textarea
                            placeholder={t("bot.instructionsPlaceholder")}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={4}
                            className="resize-y"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("bot.instructionsDesc")}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium">{t("bot.responseStyleLabel")}</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "concise", label: t("bot.styleConcise"), icon: "Zap", desc: t("bot.styleConciseDesc") },
                                { value: "balanced", label: t("bot.styleBalanced"), icon: "Scale", desc: t("bot.styleBalancedDesc") },
                                { value: "detailed", label: t("bot.styleDetailed"), icon: "BookOpen", desc: t("bot.styleDetailedDesc") },
                            ].map((style) => (
                                <button
                                    key={style.value}
                                    onClick={() => setResponseStyle(style.value)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${responseStyle === style.value
                                        ? "border-brand bg-brand/5"
                                        : "border-border/60 hover:border-border hover:bg-muted/30"
                                        }`}
                                >
                                    <AppIcon name={style.icon as any} className={`h-5 w-5 ${responseStyle === style.value ? "text-brand" : "text-muted-foreground"}`} />
                                    <span className="text-sm font-medium">{style.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{style.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Context Message */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AppIcon name="MessageCircle" className="h-5 w-5 text-brand" />
                        {t("bot.contextMessageTitle")}
                    </CardTitle>
                    <CardDescription>
                        {t("bot.contextMessageDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Textarea
                        placeholder={t("bot.contextMessagePlaceholder")}
                        value={contextMessage}
                        onChange={(e) => setContextMessage(e.target.value)}
                        rows={3}
                        className="resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t("bot.contextMessageExtra")}
                    </p>
                </CardContent>
            </Card>

            {/* Suggested Messages */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AppIcon name="Sparkles" className="h-5 w-5 text-brand" />
                        {t("bot.suggestedMessagesTitle")}
                    </CardTitle>
                    <CardDescription>
                        {t("bot.suggestedMessagesDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {suggestedMsgs.length > 0 && (
                        <div className="space-y-2">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={suggestedMsgs.map(sm => sm.label + sm.prompt)} strategy={verticalListSortingStrategy}>
                                    {suggestedMsgs.map((sm, idx) => (
                                        <SortableSuggestedMsg
                                            key={sm.label + sm.prompt}
                                            id={sm.label + sm.prompt}
                                            sm={sm}
                                            isFirst={idx === 0}
                                            isLast={idx === suggestedMsgs.length - 1}
                                            onMoveUp={() => moveMsg(idx, 'up')}
                                            onMoveDown={() => moveMsg(idx, 'down')}
                                            onEdit={() => {
                                                setNewSugLabel(sm.label);
                                                setNewSugPrompt(sm.prompt);
                                                setSuggestedMsgs(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                            onDelete={() => setSuggestedMsgs(prev => prev.filter((_, i) => i !== idx))}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-border/60 bg-muted/5 transition-colors focus-within:border-brand focus-within:bg-brand/5">
                        <Input
                            placeholder={t("bot.btnLabelPlaceholder")}
                            value={newSugLabel}
                            onChange={(e) => setNewSugLabel(e.target.value)}
                            className="h-9 text-sm"
                        />
                        <Input
                            placeholder={t("bot.promptPlaceholder")}
                            value={newSugPrompt}
                            onChange={(e) => setNewSugPrompt(e.target.value)}
                            className="h-9 text-sm"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (newSugLabel.trim() && newSugPrompt.trim()) {
                                    setSuggestedMsgs(prev => [...prev, { label: newSugLabel.trim(), prompt: newSugPrompt.trim() }]);
                                    setNewSugLabel("");
                                    setNewSugPrompt("");
                                }
                            }}
                            disabled={!newSugLabel.trim() || !newSugPrompt.trim()}
                            className="self-start"
                        >
                            <AppIcon name="Plus" className="h-3.5 w-3.5 mr-1" />
                            {t("bot.addSuggestion")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AppIcon name="SlidersHorizontal" className="h-5 w-5 text-brand" />
                                {t("bot.advancedSettings")}
                            </CardTitle>
                        </div>
                        <AppIcon
                            name={showAdvanced ? "ChevronUp" : "ChevronDown"}
                            className="h-5 w-5 text-muted-foreground"
                        />
                    </button>
                    <CardDescription>
                        {t("bot.advancedSettingsDesc")}
                    </CardDescription>
                </CardHeader>
                {showAdvanced && (
                    <CardContent className="space-y-5 pt-0">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">{t("bot.temperature")}</Label>
                                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    {temperature.toFixed(2)}
                                </span>
                            </div>
                            <Slider
                                min={0.1}
                                max={0.8}
                                step={0.05}
                                value={[temperature]}
                                onValueChange={([v]) => setTemperature(v)}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{t("bot.precise")} (0.1)</span>
                                <span>{t("bot.creative")} (0.8)</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t("bot.maxTokens")}</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={256}
                                    max={65536}
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                                    className="h-10 w-40"
                                />
                                <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                                    ~{Math.round(maxTokens * 0.75).toLocaleString()} {t("bot.words")}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("bot.maxTokensDesc")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t("bot.systemPromptTitle")}</Label>
                            <Textarea
                                placeholder={t("bot.systemPromptPlaceholder")}
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                rows={6}
                                className="resize-y font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                ⚠️ {t("bot.systemPromptWarning")}
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand hover:bg-brand-hover text-white px-8"
                >
                    {saving ? (
                        <>
                            <AppIcon name="Loader2" className="mr-2 h-4 w-4 animate-spin-slow" />
                            {t("bot.savingConfig")}
                        </>
                    ) : saved ? (
                        <>
                            <AppIcon name="Check" className="mr-2 h-4 w-4" />
                            {t("bot.savedConfig")}
                        </>
                    ) : (
                        <>
                            <AppIcon name="Save" className="mr-2 h-4 w-4" />
                            {t("bot.saveConfig")}
                        </>
                    )}
                </Button>
                {saved && (
                    <span className="text-sm text-green-500 animate-in fade-in">
                        {t("bot.changesApplyNote")}
                    </span>
                )}
            </div>
        </div>
    );
}
