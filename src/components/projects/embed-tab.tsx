"use client";

import { QRCodeSVG } from "qrcode.react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

interface EmbedTabProps {
  projectId: string;
  project: any;
}

export function EmbedTab({ projectId, project }: EmbedTabProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopyLink = () => {
    const url = `${window.location.origin}/chat/${projectId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: t("embed.linkCopied"),
      description: t("embed.linkCopiedDesc"),
    });
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector(".qr-download-target svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySnippet = () => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`<script>
  window.chatbotConfig = {
    chatbotId: "${projectId}",
  };
</script>
<script src="${origin}/widget.js" defer></script>`);
    toast({ title: t("common.copied") });
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 h-full overflow-y-auto pb-10">
      {/* SHARE SECTION */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AppIcon name="Share2" className="h-5 w-5 text-brand" />
            {t("embed.shareTitle")}
          </CardTitle>
          <CardDescription>
            {t("embed.shareDesc")} {t("embed.publicUsageNote")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              value={typeof window !== "undefined" ? `${window.location.origin}/chat/${projectId}` : `/chat/${projectId}`}
              readOnly
              className="font-mono text-sm bg-muted/30"
            />
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="shrink-0 hover-lift">
              <AppIcon name="Copy" className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" asChild className="shrink-0 hover-lift">
              <a href={`/chat/${projectId}`} target="_blank" rel="noopener noreferrer">
                <AppIcon name="ExternalLink" className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t("embed.scanQR")}
            </p>
            <div className="p-4 bg-white rounded-xl border border-border shadow-sm qr-download-target hover-lift transition-transform">
              <QRCodeSVG
                value={typeof window !== "undefined" ? `${window.location.origin}/chat/${projectId}` : `https://yourdomain.com/chat/${projectId}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleDownloadQR}>
              <AppIcon name="Download" className="mr-2 h-4 w-4" />
              {t("embed.downloadQR")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* EMBED WIDGET CODE */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>{t("embed.widgetCode")}</CardTitle>
          <CardDescription>
            {t("embed.widgetCodeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-xl font-mono text-sm overflow-x-auto text-muted-foreground border border-border">
            {`<script>
  window.chatbotConfig = {
    chatbotId: "${projectId}",
  };
</script>
<script src="${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/widget.js" defer></script>`}
          </div>
          <div className="mt-6">
            <Button variant="secondary" onClick={handleCopySnippet} className="hover-lift">
              <AppIcon name="Copy" className="mr-2 h-4 w-4" />
              {t("embed.copySnippet")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

