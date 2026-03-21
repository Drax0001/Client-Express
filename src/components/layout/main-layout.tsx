"use client";

import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-dvh bg-brand/5 flex overflow-hidden">
      <Suspense fallback={<div className="w-64 border-r border-border bg-sidebar" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Suspense fallback={<div className="h-12 border-b border-border bg-background" />}>
          <TopNavbar />
        </Suspense>
        <main className="flex-1 min-w-0 w-full overflow-y-auto pb-16 md:pb-0" style={{ scrollbarGutter: "stable" }}>
          <div className="w-full min-h-full mx-auto p-4 md:p-8 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
