"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";


type TechnicalSettings = {
  relevanceThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  modelName: string;
  temperature: number;
  maxTokens: number;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [name, setName] = useState("");
  const defaultTechnical: TechnicalSettings = {
    relevanceThreshold: 0.4,
    chunkSize: 1000,
    chunkOverlap: 200,
    modelName: "gemini-2.5-flash",
    temperature: 0.3,
    maxTokens: 1024,
  };
  const [technical, setTechnical] =
    useState<TechnicalSettings>(defaultTechnical);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.name) {
      router.replace("/projects");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadTechnical();
  }, [status]);

  const loadTechnical = async () => {
    const response = await fetch("/api/technical-settings");
    if (!response.ok) return;
    const data = await response.json();
    setTechnical(data);
  };


  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const profileResponse = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!profileResponse.ok) {
      setSaving(false);
      const body = await profileResponse.json().catch(() => ({}));
      toast({
        title: "Profile update failed",
        description: body?.details || "Please try again.",
        variant: "destructive",
      });
      return;
    }
    const technicalResponse = await fetch("/api/technical-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(technical),
    });
    if (!technicalResponse.ok) {
      setSaving(false);
      const body = await technicalResponse.json().catch(() => ({}));
      toast({
        title: "Technical settings failed",
        description: body?.details || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    setSaving(false);
    await update();
    router.replace("/projects");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="p-6">
          <CardTitle>Tell us your name</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={submit}>
            <div className="space-y-4">
              <div className="text-sm font-semibold">Profile</div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">Technical settings</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Model name
                  </label>
                  <Input
                    value={technical.modelName}
                    onChange={(event) =>
                      setTechnical((prev) => ({
                        ...prev,
                        modelName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Max tokens
                  </label>
                  <Input
                    type="number"
                    value={technical.maxTokens}
                    onChange={(event) =>
                      setTechnical((prev) => ({
                        ...prev,
                        maxTokens: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Relevance threshold
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={technical.relevanceThreshold}
                    onChange={(event) =>
                      setTechnical((prev) => ({
                        ...prev,
                        relevanceThreshold: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Chunk size
                  </label>
                  <Input
                    type="number"
                    value={technical.chunkSize}
                    onChange={(event) =>
                      setTechnical((prev) => ({
                        ...prev,
                        chunkSize: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Chunk overlap
                  </label>
                  <Input
                    type="number"
                    value={technical.chunkOverlap}
                    onChange={(event) =>
                      setTechnical((prev) => ({
                        ...prev,
                        chunkOverlap: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Temperature
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={technical.temperature}
                    onChange={(event) =>
                      setTechnical((prev) => ({
                        ...prev,
                        temperature: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>


            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
