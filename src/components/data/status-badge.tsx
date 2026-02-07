"use client";

import { Badge } from "@/components/ui/badge";
import { AppIcon } from "@/components/ui/app-icon";

type DocumentStatus = "pending" | "processing" | "ready" | "failed";

interface StatusBadgeProps {
  status: DocumentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AppIcon name="Clock" className="h-3 w-3" />
          Pending
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AppIcon name="Sparkles" className="h-3 w-3" />
          Processing
        </Badge>
      );
    case "ready":
      return <Badge variant="success">Ready</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}
