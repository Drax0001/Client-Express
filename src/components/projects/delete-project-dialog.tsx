"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteProject } from "@/lib/api/hooks";
import { AppIcon } from "@/components/ui/app-icon";

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  children?: React.ReactNode;
}

export function DeleteProjectDialog({
  projectId,
  projectName,
  children,
}: DeleteProjectDialogProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const deleteProjectMutation = useDeleteProject();

  const handleDelete = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      setOpen(false);
      router.push("/projects");
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <>
      {deleteProjectMutation.isPending && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin-slow rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg font-medium">Deleting project...</span>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          {children || (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AppIcon name="Trash2" className="h-4 w-4" />
              <span className="sr-only">Delete project</span>
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{projectName}"</strong>?
              This action cannot be undone and will permanently delete all
              associated documents and chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProjectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
