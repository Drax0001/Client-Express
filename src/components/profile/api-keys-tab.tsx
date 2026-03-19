"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppIcon } from "@/components/ui/app-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export function ApiKeysTab({ plan }: { plan: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (e) {
      console.error("Failed to fetch keys", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/profile/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setCreatedKey(data.rawKey);
      setKeys([data.key, ...keys]);
      toast({
        title: t("apikeys.createFailed") || "Failed to create API key",
        description: t("apikeys.tryAgain") || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm(t("apikeys.confirmRevoke") || "Are you sure you want to revoke this API key?")) return;
    try {
      const res = await fetch(`/api/profile/api-keys/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== id));
        toast({ title: t("apikeys.revokeSuccess") || "API key revoked successfully" });
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      toast({
        title: t("apikeys.revokeFailed") || "Revoke failed",
        description: t("apikeys.revokeFailedDesc") || "Could not revoke the API key.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    toast({ title: t("common.copied") || "Copied to clipboard" });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
  };

  const isFreePlan = plan === "FREE";

  return (
    <Card className="border-border/60 bg-card/50 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t("apikeys.title") || "API Keys"}</CardTitle>
        <CardDescription>{t("apikeys.subtitle") || "Manage keys used to programmatically authenticate your API requests."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {isFreePlan && (
          <Alert className="border-brand/30 bg-brand/5">
            <AppIcon name="Lock" className="h-4 w-4 text-brand" />
            <AlertTitle className="text-foreground">{t("apikeys.availableOnPro") || "Available on PRO"}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {t("apikeys.availableOnProDesc") || "API keys are only available on the PRO and BUSINESS plans. "}
              <Link href="/checkout?plan=PRO" className="text-brand font-medium hover:underline ml-1">Upgrade now</Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center pb-4 border-b border-border/40">
          <div>
            <h3 className="text-sm font-medium text-foreground">{t("apikeys.yourKeys") || "Your secret keys"}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("apikeys.yourKeysDesc") || "Do not share your API keys with anyone or commit them to version control."}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) closeDialog();
            else setIsDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button disabled={isFreePlan} className="bg-brand hover:bg-brand-hover text-white">
                <AppIcon name="Plus" className="h-4 w-4 mr-2" /> {t("apikeys.createKey") || "Create new secret key"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("apikeys.createKey") || "Create new secret key"}</DialogTitle>
                <DialogDescription>
                  {t("apikeys.createKeyDesc") || "This key will allow you to authenticate API requests programmatically."}
                </DialogDescription>
              </DialogHeader>

              {!createdKey ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("apikeys.nameLabel") || "Name"}</label>
                    <Input 
                      placeholder={t("apikeys.namePlaceholder") || "My amazing app"}
                      value={newKeyName} 
                      onChange={(e) => setNewKeyName(e.target.value)} 
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>{t("common.cancel") || "Cancel"}</Button>
                    <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating} className="bg-brand hover:bg-brand-hover text-white">
                      {t("apikeys.createKey") || "Create secret key"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500">
                    <AppIcon name="AlertTriangle" className="h-4 w-4" />
                    <AlertTitle>{t("apikeys.saveSafe") || "Please save this secret key somewhere safe and accessible."}</AlertTitle>
                    <AlertDescription>
                      {t("apikeys.wontBeAbleToView") || "For security reasons, you won't be able to view it again through your account. If you lose this secret key, you'll need to generate a new one."}
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={createdKey} readOnly className="font-mono text-sm bg-muted" />
                    <Button variant="secondary" size="icon" onClick={copyToClipboard} className="shrink-0">
                      <AppIcon name="Copy" className="h-4 w-4" />
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialog} className="w-full">{t("apikeys.done") || "Done"}</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t("apikeys.noKeys") || "You don't have any API keys yet."}</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="font-medium p-3">{t("apikeys.colName") || "NAME"}</th>
                  <th className="font-medium p-3">{t("apikeys.colKey") || "SECRET KEY"}</th>
                  <th className="font-medium p-3">{t("apikeys.colCreated") || "CREATED"}</th>
                  <th className="font-medium p-3">{t("apikeys.colLastUsed") || "LAST USED"}</th>
                  <th className="font-medium p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{key.name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{key.prefix}•••••••••••••••••••••</td>
                    <td className="p-3 text-muted-foreground">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-muted-foreground">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : (t("apikeys.neverUsed") || "Never")}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(key.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <AppIcon name="Trash2" className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
