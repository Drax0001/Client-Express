"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";

interface ProjectCardProps {
  id: string;
  name: string;
  createdAt: Date;
  documentCount: number;
}

export function ProjectCard({
  id,
  name,
  createdAt,
  documentCount,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="group relative overflow-hidden hover-lift transition-all duration-300 touch-manipulation border-0 shadow-soft bg-gradient-to-br from-card via-card to-card/50 cursor-pointer">
        <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-lg"></div>
        <CardHeader className="pb-4 relative">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-bold truncate pr-2 bg-gradient-primary bg-clip-text text-transparent">
            {name}
          </CardTitle>
          <DeleteProjectDialog projectId={id} projectName={name}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-manipulation flex-shrink-0 rounded-full transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete project</span>
            </Button>
          </DeleteProjectDialog>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">
            {documentCount} {documentCount === 1 ? "document" : "documents"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{documentCount} documents</span>
          </div>
          <Badge variant="outline">
            {documentCount > 0 ? "Ready" : "Empty"}
          </Badge>
        </div>

        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
          <Button
            asChild
            className="flex-1 bg-gradient-secondary hover:opacity-90 text-secondary-foreground shadow-soft hover:shadow-medium transition-all font-semibold"
          >
            <Link href={`/projects/${id}`} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manage
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="bg-gradient-accent hover:bg-accent text-accent-foreground border-accent/20 shadow-soft hover:shadow-medium transition-all font-semibold"
          >
            <Link
              href={`/projects/${id}/chat`}
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              Chat
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Created {createdAt.toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
    </Link>
  );
}
