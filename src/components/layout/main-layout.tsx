"use client";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="w-full max-w-6xl mr-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
