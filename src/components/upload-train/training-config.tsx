"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface TrainingConfig {
  name: string;
  description?: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
}

interface TrainingConfigProps {
  config: TrainingConfig;
  onConfigChange: (config: TrainingConfig) => void;
  disabled?: boolean;
  className?: string;
}

const EMBEDDING_MODELS = [
  {
    value: "gemini",
    label: "Google Gemini",
    description: "High-quality embeddings",
  },
  {
    value: "local",
    label: "Local Model",
    description: "Run locally for privacy",
  },
];

const RECOMMENDED_PRESETS = {
  general: {
    chunkSize: 1000,
    chunkOverlap: 200,
    temperature: 0.3,
    maxTokens: 1024,
    name: "General Purpose",
  },
  technical: {
    chunkSize: 800,
    chunkOverlap: 150,
    temperature: 0.2,
    maxTokens: 2048,
    name: "Technical Documentation",
  },
  creative: {
    chunkSize: 1200,
    chunkOverlap: 250,
    temperature: 0.5,
    maxTokens: 1536,
    name: "Creative Content",
  },
};

export function TrainingConfig({
  config,
  onConfigChange,
  disabled = false,
  className,
}: TrainingConfigProps) {
  const updateConfig = (updates: Partial<TrainingConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const applyPreset = (preset: typeof RECOMMENDED_PRESETS.general) => {
    updateConfig({
      chunkSize: preset.chunkSize,
      chunkOverlap: preset.chunkOverlap,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
    });
  };

  const getEstimatedTokens = (chunkSize: number, overlap: number): number => {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.round((chunkSize - overlap) / 4);
  };

  const validateConfig = (): string[] => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push("Chatbot name is required");
    }

    if (config.chunkSize < 500 || config.chunkSize > 2000) {
      errors.push("Chunk size must be between 500 and 2000 characters");
    }

    if (config.chunkOverlap < 0 || config.chunkOverlap >= config.chunkSize) {
      errors.push(
        "Chunk overlap must be less than chunk size and non-negative",
      );
    }

    if (config.temperature < 0 || config.temperature > 1) {
      errors.push("Temperature must be between 0 and 1");
    }

    if (config.maxTokens < 100 || config.maxTokens > 4096) {
      errors.push("Max tokens must be between 100 and 4096");
    }

    return errors;
  };

  const errors = validateConfig();
  const estimatedTokens = getEstimatedTokens(
    config.chunkSize,
    config.chunkOverlap,
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AppIcon name="Settings" className="h-5 w-5" />
          Training Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure how your documents will be processed and how your chatbot
          will respond
        </p>
      </div>

      {/* Quick Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Presets</CardTitle>
          <CardDescription>
            Choose a recommended configuration for your use case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RECOMMENDED_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                disabled={disabled}
                className="h-auto p-2 flex flex-col items-start"
              >
                <span className="font-medium">{preset.name}</span>
                <span className="text-xs text-muted-foreground">
                  {preset.chunkSize} chars • {preset.temperature} temp
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatbot-name">Chatbot Name *</Label>
            <Input
              id="chatbot-name"
              placeholder="My Knowledge Assistant"
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              disabled={disabled}
              className={cn(
                !config.name.trim() &&
                  "border-destructive focus-visible:ring-destructive",
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatbot-description">Description (Optional)</Label>
            <Textarea
              id="chatbot-description"
              placeholder="Describe what this chatbot specializes in..."
              value={config.description || ""}
              onChange={(e) => updateConfig({ description: e.target.value })}
              disabled={disabled}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Processing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Document Processing
            <AppIcon name="Info" className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Configure how documents are split into chunks for processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="chunk-size">
                Chunk Size: {config.chunkSize} characters
              </Label>
              <Badge variant="secondary">{estimatedTokens} tokens/chunk</Badge>
            </div>
            <Slider
              id="chunk-size"
              min={500}
              max={2000}
              step={50}
              value={[config.chunkSize]}
              onValueChange={([value]) => updateConfig({ chunkSize: value })}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Larger chunks provide more context but may reduce accuracy
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="chunk-overlap">
              Chunk Overlap: {config.chunkOverlap} characters
            </Label>
            <Slider
              id="chunk-overlap"
              min={0}
              max={Math.min(config.chunkSize - 50, 500)}
              step={25}
              value={[config.chunkOverlap]}
              onValueChange={([value]) => updateConfig({ chunkOverlap: value })}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Overlap helps maintain context between chunks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Model Configuration</CardTitle>
          <CardDescription>
            Choose the models for embedding generation and response generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="embedding-model">Embedding Model</Label>
            <Select
              value={config.embeddingModel}
              onValueChange={(value) => updateConfig({ embeddingModel: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select embedding model" />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div>
                      <div className="font-medium">{model.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature: {config.temperature}
              </Label>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[config.temperature]}
                onValueChange={([value]) =>
                  updateConfig({ temperature: value })
                }
                disabled={disabled}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, Higher = more creative
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens: {config.maxTokens}</Label>
              <Slider
                id="max-tokens"
                min={100}
                max={4096}
                step={100}
                value={[config.maxTokens]}
                onValueChange={([value]) => updateConfig({ maxTokens: value })}
                disabled={disabled}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum response length
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Processing:</span>
              <div className="font-medium">
                {config.chunkSize} chars • {config.chunkOverlap} overlap
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Response:</span>
              <div className="font-medium">
                {config.temperature} temp • {config.maxTokens} tokens
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
