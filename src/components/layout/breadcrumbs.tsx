"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useProject } from "@/lib/api/hooks";
import { AppIcon } from "@/components/ui/app-icon";

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  
  // If we are under a project route, fetch the project to convert ID to Name
  const projectId = params?.id as string | undefined;
  const { data: project } = useProject(projectId || "");

  // Don't render breadcrumbs on home page or if pathname is empty
  if (!pathname || pathname === "/") return null;

  // Manually split and format the path segments
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 hidden sm:block">
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors flex items-center">
            <AppIcon name="Home" className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          
          // Format segment to be more readable
          const formattedSegment = segment === projectId && project
            ? project.name
            : segment
            .replace(/-/g, " ")
            .replace(/([A-Z])/g, " $1")
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          return (
            <li key={segment} className="flex items-center space-x-2">
              <AppIcon name="ChevronRight" className="h-4 w-4 text-muted-foreground/50" />
              {isLast ? (
                <span className="font-medium text-foreground truncate max-w-[150px] lg:max-w-[300px]" aria-current="page">
                  {formattedSegment}
                </span>
              ) : (
                <Link href={href} className="hover:text-foreground transition-colors truncate max-w-[150px] lg:max-w-[300px]">
                  {formattedSegment}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
