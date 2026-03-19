"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  featureName?: string;
  requiredPlan?: "PRO" | "BUSINESS";
  onUpgradeClick?: () => void;
}

export function UpgradeModal({
  open,
  onOpenChange,
  title,
  description,
  featureName,
  requiredPlan,
  onUpgradeClick
}: UpgradeModalProps) {
  const { t } = useTranslation();

  const handleUpgradeClick = () => {
    onOpenChange(false);
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
            <AppIcon name="Zap" className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">
            {title || `Upgrade to ${requiredPlan || "PRO"} to unlock this feature`}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description || (
              <>
                <strong>{featureName || "This feature"}</strong> is only available on the {requiredPlan || "PRO"} plan or higher. 
                Upgrade your account to unlock this and many other advanced capabilities.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-col gap-3 mt-4">
          <Button 
            asChild 
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
            onClick={handleUpgradeClick}
          >
            <Link href="/settings?tab=billing">
              <AppIcon name="Crown" className="mr-2 h-4 w-4" />
              Upgrade Now
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
