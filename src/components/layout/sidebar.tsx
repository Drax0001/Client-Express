"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const displayName = session?.user?.name?.trim();

  return (
    <aside
      className={`hidden md:flex md:flex-col md:shrink-0 ${collapsed ? "md:w-20" : "md:w-72"} bg-background border-r border-border/50 p-3 min-h-0 sticky top-20 h-[calc(100vh-5rem)] overflow-hidden`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <Link href="/projects" className="flex items-center gap-3">
          <Image src="/images/clientExpressLogo.png" alt="ClientExpress" width={50} height={50} className="" />
          {!collapsed && (
            <span className="font-bold">
              ClientExpress
            </span>
          )}
        </Link>
      </div>

      <nav className="mt-2 flex-1 min-h-0 space-y-1 pr-1">
        <Link
          href="/projects"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/10"
        >
          <AppIcon name="Home" className="h-4 w-4" />
          {!collapsed && <span className="truncate">Projects</span>}
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/10"
        >
          <AppIcon name="Settings" className="h-4 w-4" />
          {!collapsed && <span className="truncate">Settings</span>}
        </Link>
      </nav>

      <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between">
        {!collapsed && session?.user && (
          <div className="flex flex-col gap-1 px-2 text-xs">
            <span className="text-muted-foreground truncate">
              {displayName || session.user.email || "User"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full justify-start h-8 text-xs"
            >
              <AppIcon name="LogOut" className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((s) => !s)}
          aria-label="Toggle sidebar"
          className="ml-auto"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={collapsed ? "rotate-180" : ""}
          >
            <path
              d="M9 6L15 12L9 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </aside>
  );
}
