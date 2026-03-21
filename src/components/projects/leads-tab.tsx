"use client";

import { useState, useEffect, useCallback } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  collectedAt: string;
}

interface LeadsTabProps {
  projectId: string;
}

export function LeadsTab({ projectId }: LeadsTabProps) {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/leads`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch { }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const downloadCSV = () => {
    const headers = [t("leads.colName"), t("leads.colEmail"), t("leads.colPhone"), t("leads.colDate")];
    const rows = leads.map(l => [
      l.name ?? "",
      l.email ?? "",
      l.phone ?? "",
      new Date(l.collectedAt).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${projectId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-8 animate-in fade-in duration-300">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AppIcon name="Users" className="h-5 w-5 text-brand" />
                {t("leads.collectedLeads")}
                {total > 0 && <Badge variant="secondary">{total}</Badge>}
              </CardTitle>
              <CardDescription>
                {t("leads.collectedLeadsDesc")}
              </CardDescription>
            </div>
            {leads.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadCSV}>
                <AppIcon name="Download" className="mr-1.5 h-3.5 w-3.5" />
                {t("leads.exportCSV")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <AppIcon name="UserX" className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">{t("leads.noLeads")}</p>
              <p className="text-xs">{t("leads.noLeadsDesc")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{t("leads.colName")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{t("leads.colEmail")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{t("leads.colPhone")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{t("leads.colDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">{lead.name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2.5 px-3">{lead.email || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2.5 px-3">{lead.phone || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">
                        {new Date(lead.collectedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
