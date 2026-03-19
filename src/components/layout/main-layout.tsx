"use client";

import { Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-dvh bg-brand/5 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopNavbar />
        <main className="flex-1 min-w-0 w-full overflow-y-auto pb-16 md:pb-0" style={{ scrollbarGutter: "stable" }}>
          <div className="w-full h-full mx-auto p-4 md:p-8 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
