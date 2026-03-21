"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { SuggestedMessage } from "@/lib/api/types";

interface SuggestedMessagesEditorProps {
  messages: SuggestedMessage[];
  onChange: (messages: SuggestedMessage[]) => void;
}

export function SuggestedMessagesEditor({ messages, onChange }: SuggestedMessagesEditorProps) {
  const { t } = useTranslation();

  const addTopLevel = () => {
    onChange([...messages, { label: "", prompt: "" }]);
  };

  const updateTopLevel = (index: number, field: "label" | "prompt", value: string) => {
    const next = [...messages];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeTopLevel = (index: number) => {
    const next = [...messages];
    next.splice(index, 1);
    onChange(next);
  };

  const addSubMessage = (parentIndex: number) => {
    const next = [...messages];
    const parent = next[parentIndex];
    const subMessages = parent.subMessages || [];
    next[parentIndex] = {
      ...parent,
      subMessages: [...subMessages, { label: "", prompt: "" }]
    };
    onChange(next);
  };

  const updateSubMessage = (parentIndex: number, subIndex: number, field: "label" | "prompt", value: string) => {
    const next = [...messages];
    const parent = next[parentIndex];
    if (!parent.subMessages) return;
    
    const subMessages = [...parent.subMessages];
    subMessages[subIndex] = { ...subMessages[subIndex], [field]: value };
    next[parentIndex] = { ...parent, subMessages };
    onChange(next);
  };

  const removeSubMessage = (parentIndex: number, subIndex: number) => {
    const next = [...messages];
    const parent = next[parentIndex];
    if (!parent.subMessages) return;

    const subMessages = [...parent.subMessages];
    subMessages.splice(subIndex, 1);
    next[parentIndex] = { ...parent, subMessages };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => (
        <div key={idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3">
          <div className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <Input
                value={msg.label}
                onChange={(e) => updateTopLevel(idx, "label", e.target.value)}
                placeholder="Button Label (e.g. Pricing)"
                className="h-9 bg-background"
              />
              <Input
                value={msg.prompt}
                onChange={(e) => updateTopLevel(idx, "prompt", e.target.value)}
                placeholder="Full Prompt (e.g. Walk me through the pricing plans)"
                className="h-9 bg-background text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTopLevel(idx)}
              className="text-muted-foreground hover:text-destructive h-9 px-2 shrink-0"
              title="Remove Message"
            >
              <AppIcon name="Trash2" className="h-4 w-4" />
            </Button>
          </div>

          {/* Sub Messages List */}
          {(msg.subMessages || []).length > 0 && (
            <div className="pl-6 space-y-2 border-l-2 border-border/40 ml-2">
              <div className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1.5 pt-1">
                <AppIcon name="CornerDownRight" className="h-3 w-3" />
                Follow-up Suggestions
              </div>
              {msg.subMessages!.map((sub, sIdx) => (
                <div key={sIdx} className="flex gap-2 items-start bg-background p-2 rounded-lg border border-border/40 shadow-sm relative group">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={sub.label}
                      onChange={(e) => updateSubMessage(idx, sIdx, "label", e.target.value)}
                      placeholder="Button Label"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={sub.prompt}
                      onChange={(e) => updateSubMessage(idx, sIdx, "prompt", e.target.value)}
                      placeholder="Full Prompt"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubMessage(idx, sIdx)}
                    className="text-muted-foreground hover:text-destructive h-8 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Follow-up"
                  >
                    <AppIcon name="X" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Sub Message Button */}
          <div className="pl-6 ml-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSubMessage(idx)}
              className="h-7 text-[10px] bg-background border-dashed text-muted-foreground hover:text-foreground"
            >
              <AppIcon name="CornerDownRight" className="mr-1.5 h-3 w-3" /> Add Follow-up Message
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addTopLevel}
        className="w-full border-dashed py-5"
      >
        <AppIcon name="Plus" className="mr-2 h-4 w-4 text-brand" /> Add Suggestion
      </Button>
    </div>
  );
}
