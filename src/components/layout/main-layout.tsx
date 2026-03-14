"use client";

import { Sidebar } from "./sidebar";
import { Breadcrumbs } from "./breadcrumbs";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-dvh bg-background flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full overflow-y-auto pb-16 md:pb-0">
        <div className="w-full h-full mx-auto p-4 md:p-8 flex flex-col">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}
