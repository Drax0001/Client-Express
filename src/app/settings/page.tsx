"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
};

type ApiKeyItem = {
  kind: "llm" | "embedding";
  lastFour: string;
  createdAt: string;
  updatedAt: string;
};

type TechnicalSettings = {
  relevanceThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  modelName: string;
  temperature: number;
  maxTokens: number;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [technical, setTechnical] = useState<TechnicalSettings | null>(null);
  const [savingTechnical, setSavingTechnical] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [llmKey, setLlmKey] = useState("");
  const [embeddingKey, setEmbeddingKey] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);

  const loadProfile = async () => {
    const response = await fetch("/api/profile");
    if (!response.ok) return;
    const data = await response.json();
    setProfile(data);
    setProfileName(data?.name ?? "");
  };

  const loadTechnical = async () => {
    const response = await fetch("/api/technical-settings");
    if (!response.ok) return;
    const data = await response.json();
    setTechnical(data);
  };

  const loadApiKeys = async () => {
    const response = await fetch("/api/api-keys");
    if (!response.ok) return;
    const data = await response.json();
    setApiKeys(data?.keys ?? []);
  };

  useEffect(() => {
    loadProfile();
    loadTechnical();
    loadApiKeys();
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

  const saveTechnical = async () => {
    if (!technical) return;
    setSavingTechnical(true);
    const response = await fetch("/api/technical-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(technical),
    });
    setSavingTechnical(false);
    if (response.ok) {
      toast({ title: "Technical settings updated" });
      await loadTechnical();
      return;
    }
    const body = await response.json().catch(() => ({}));
    toast({
      title: "Update failed",
      description: body?.details || "Please try again.",
      variant: "destructive",
    });
  };

  const saveApiKey = async (kind: "llm" | "embedding", value: string) => {
    if (!value.trim()) return;
    setSavingKeys(true);
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, value }),
    });
    setSavingKeys(false);
    if (response.ok) {
      if (kind === "llm") setLlmKey("");
      if (kind === "embedding") setEmbeddingKey("");
      await loadApiKeys();
      toast({ title: "API key saved" });
      return;
    }
    const body = await response.json().catch(() => ({}));
    toast({
      title: "API key update failed",
      description: body?.details || "Please try again.",
      variant: "destructive",
    });
  };

  const deleteApiKey = async (kind: "llm" | "embedding") => {
    setSavingKeys(true);
    const response = await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setSavingKeys(false);
    if (response.ok) {
      await loadApiKeys();
      toast({ title: "API key removed" });
      return;
    }
    const body = await response.json().catch(() => ({}));
    toast({
      title: "API key removal failed",
      description: body?.details || "Please try again.",
      variant: "destructive",
    });
  };

  const llmSaved = apiKeys.find((key) => key.kind === "llm");
  const embeddingSaved = apiKeys.find((key) => key.kind === "embedding");

  return (
    <MainLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save profile"}
              </Button>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Model name</label>
                <Input
                  value={technical?.modelName ?? ""}
                  onChange={(event) =>
                    setTechnical((prev) =>
                      prev ? { ...prev, modelName: event.target.value } : prev,
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max tokens</label>
                <Input
                  type="number"
                  value={technical?.maxTokens ?? 0}
                  onChange={(event) =>
                    setTechnical((prev) =>
                      prev
                        ? { ...prev, maxTokens: Number(event.target.value) }
                        : prev,
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Relevance threshold
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={technical?.relevanceThreshold ?? 0}
                  onChange={(event) =>
                    setTechnical((prev) =>
                      prev
                        ? {
                            ...prev,
                            relevanceThreshold: Number(event.target.value),
                          }
                        : prev,
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Temperature
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={technical?.temperature ?? 0}
                  onChange={(event) =>
                    setTechnical((prev) =>
                      prev
                        ? { ...prev, temperature: Number(event.target.value) }
                        : prev,
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Chunk size</label>
                <Input
                  type="number"
                  value={technical?.chunkSize ?? 0}
                  onChange={(event) =>
                    setTechnical((prev) =>
                      prev ? { ...prev, chunkSize: Number(event.target.value) } : prev,
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Chunk overlap
                </label>
                <Input
                  type="number"
                  value={technical?.chunkOverlap ?? 0}
                  onChange={(event) =>
                    setTechnical((prev) =>
                      prev
                        ? { ...prev, chunkOverlap: Number(event.target.value) }
                        : prev,
                    )
                  }
                />
              </div>
            </div>
            <Button onClick={saveTechnical} disabled={savingTechnical || !technical}>
              {savingTechnical ? "Saving..." : "Save technical settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Key settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-medium">LLM API key</div>
              {llmSaved && (
                <div className="text-xs text-muted-foreground">
                  Saved key ending in {llmSaved.lastFour}
                </div>
              )}
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  type="password"
                  placeholder="Paste your LLM API key"
                  value={llmKey}
                  onChange={(event) => setLlmKey(event.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => saveApiKey("llm", llmKey)}
                    disabled={savingKeys}
                  >
                    Save
                  </Button>
                  {llmSaved && (
                    <Button
                      variant="outline"
                      onClick={() => deleteApiKey("llm")}
                      disabled={savingKeys}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Embedding API key</div>
              {embeddingSaved && (
                <div className="text-xs text-muted-foreground">
                  Saved key ending in {embeddingSaved.lastFour}
                </div>
              )}
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  type="password"
                  placeholder="Paste your embedding API key"
                  value={embeddingKey}
                  onChange={(event) => setEmbeddingKey(event.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => saveApiKey("embedding", embeddingKey)}
                    disabled={savingKeys}
                  >
                    Save
                  </Button>
                  {embeddingSaved && (
                    <Button
                      variant="outline"
                      onClick={() => deleteApiKey("embedding")}
                      disabled={savingKeys}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
