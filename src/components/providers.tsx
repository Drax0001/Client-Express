"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/query-client";
import { I18nProvider } from "@/lib/i18n";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            {children}
            <Toaster />
            <ReactQueryDevtools initialIsOpen={false} />
          </I18nProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
