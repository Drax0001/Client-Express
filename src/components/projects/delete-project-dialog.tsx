"use client";

import * as React from "react";
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
  const deleteProjectMutation = useDeleteProject();

  const handleDelete = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      setOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
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
  );
}
