"use client";

import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/app-icon";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(({ loading, loadingText, children, disabled, ...props }, ref) => {
  return (
    <Button ref={ref} disabled={loading || disabled} {...props}>
      {loading && (
        <AppIcon name="Loader2" className="mr-2 h-4 w-4 animate-spin-slow" />
      )}
      {loading ? loadingText || "Loading..." : children}
    </Button>
  );
});

LoadingButton.displayName = "LoadingButton";
