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
}

interface BotSettingsPanelProps {
    projectId: string;
}

export function BotSettingsPanel({ projectId }: BotSettingsPanelProps) {
    const [config, setConfig] = useState<BotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [modelId, setModelId] = useState("gemini-2.5-flash");
    const [persona, setPersona] = useState("");
    const [instructions, setInstructions] = useState("");
    const [systemPrompt, setSystemPrompt] = useState("");
    const [temperature, setTemperature] = useState(0.4);
    const [maxTokens, setMaxTokens] = useState(2048);
    const [responseStyle, setResponseStyle] = useState("balanced");
    const [contextMessage, setContextMessage] = useState("");
    const [suggestedMsgs, setSuggestedMsgs] = useState<SuggestedMsg[]>([]);
    const [newSugLabel, setNewSugLabel] = useState("");
    const [newSugPrompt, setNewSugPrompt] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);

    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/projects/${projectId}/bot-config`);
            if (!res.ok) throw new Error("Failed to load config");
            const data: BotConfig = await res.json();
            setConfig(data);
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
            setError("Failed to load bot configuration");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

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
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
        );
    }

    const models = config?.availableModels || [];

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
                        AI Model
                    </CardTitle>
                    <CardDescription>
                        Choose the Gemini model that powers your chatbot
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => setModelId(model.id)}
                                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${modelId === model.id
                                    ? "border-brand bg-brand/5 shadow-sm"
                                    : "border-border/60 hover:border-border hover:bg-muted/30"
                                    }`}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${modelId === model.id ? "border-brand" : "border-muted-foreground/40"
                                    }`}>
                                    {modelId === model.id && (
                                        <div className="w-2 h-2 rounded-full bg-brand" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm">{model.name}</span>
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
                                </div>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Persona & Instructions */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AppIcon name="User" className="h-5 w-5 text-brand" />
                        Personality & Behavior
                    </CardTitle>
                    <CardDescription>
                        Shape how your chatbot communicates with users
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Persona</Label>
                        <Input
                            placeholder='e.g. "A friendly tech support agent who explains things simply"'
                            value={persona}
                            onChange={(e) => setPersona(e.target.value)}
                            className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                            Defines the chatbot&apos;s personality and communication style
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Custom Instructions</Label>
                        <Textarea
                            placeholder={`e.g.\n- Always greet users warmly\n- Focus on code examples when relevant\n- Recommend contacting support for billing questions`}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={4}
                            className="resize-y"
                        />
                        <p className="text-xs text-muted-foreground">
                            Specific rules and behaviors for the chatbot to follow
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Response Style</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "concise", label: "Concise", icon: "Zap", desc: "Short & direct" },
                                { value: "balanced", label: "Balanced", icon: "Scale", desc: "Well-rounded" },
                                { value: "detailed", label: "Detailed", icon: "BookOpen", desc: "Comprehensive" },
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
                        Context Message
                    </CardTitle>
                    <CardDescription>
                        This context is automatically appended to every user query to improve answer relevance
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Textarea
                        placeholder={`e.g. "This chatbot serves customers of Acme Corp, a SaaS platform for project management. Users may ask about pricing, features, onboarding, and troubleshooting."`}
                        value={contextMessage}
                        onChange={(e) => setContextMessage(e.target.value)}
                        rows={3}
                        className="resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                        Even vague user queries will carry value with this context attached.
                    </p>
                </CardContent>
            </Card>

            {/* Suggested Messages */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AppIcon name="Sparkles" className="h-5 w-5 text-brand" />
                        Suggested Messages
                    </CardTitle>
                    <CardDescription>
                        Quick-action buttons shown after the welcome message and after each bot reply
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {suggestedMsgs.length > 0 && (
                        <div className="space-y-2">
                            {suggestedMsgs.map((sm, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{sm.label}</p>
                                        <p className="text-xs text-muted-foreground truncate">{sm.prompt}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSuggestedMsgs(prev => prev.filter((_, i) => i !== idx))}
                                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <AppIcon name="X" className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-border/60">
                        <Input
                            placeholder="Button label (e.g. 'How do I get started?')"
                            value={newSugLabel}
                            onChange={(e) => setNewSugLabel(e.target.value)}
                            className="h-9 text-sm"
                        />
                        <Input
                            placeholder="Full prompt sent to bot (e.g. 'Explain the onboarding process step by step')"
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
                            Add Suggestion
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
                                Advanced Settings
                            </CardTitle>
                        </div>
                        <AppIcon
                            name={showAdvanced ? "ChevronUp" : "ChevronDown"}
                            className="h-5 w-5 text-muted-foreground"
                        />
                    </button>
                    <CardDescription>
                        Fine-tune temperature, token limits, and system prompt
                    </CardDescription>
                </CardHeader>
                {showAdvanced && (
                    <CardContent className="space-y-5 pt-0">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Temperature</Label>
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
                                <span>Precise (0.1)</span>
                                <span>Creative (0.8)</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Max Output Tokens</Label>
                            <Input
                                type="number"
                                min={256}
                                max={65536}
                                value={maxTokens}
                                onChange={(e) => setMaxTokens(Number(e.target.value))}
                                className="h-10 w-40"
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum length of each response (256–65,536)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Custom System Prompt</Label>
                            <Textarea
                                placeholder="Override the default system prompt (leave empty to use the built-in intelligent prompt)"
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                rows={6}
                                className="resize-y font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                ⚠️ Overrides the default prompt — only use if you know what you&apos;re doing. Language matching and response style will still be appended.
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
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <AppIcon name="Check" className="mr-2 h-4 w-4" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <AppIcon name="Save" className="mr-2 h-4 w-4" />
                            Save Configuration
                        </>
                    )}
                </Button>
                {saved && (
                    <span className="text-sm text-green-500 animate-in fade-in">
                        Changes will apply to new conversations
                    </span>
                )}
            </div>
        </div>
    );
}
