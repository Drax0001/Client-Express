"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/forms";
import { useCreateProject } from "@/lib/api/hooks";

// Validation schema for project creation
const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less")
    .trim(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface CreateProjectDialogProps {
  children?: React.ReactNode;
}

export const CreateProjectDialog = React.forwardRef<
  {
    openDialog: () => void;
  },
  CreateProjectDialogProps
>(({ children }, ref) => {
  const [open, setOpen] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    openDialog: () => setOpen(true),
  }));
  const createProjectMutation = useCreateProject();

  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      await createProjectMutation.mutateAsync(data);
      form.reset();
      setOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || <Button>Create Project</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new knowledge base project to organize your documents and
            chat with your content.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <FormField
              name="name"
              label="Project Name"
              placeholder="e.g., Company Policies, Product Documentation"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending
                ? "Creating..."
                : "Create Project"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

CreateProjectDialog.displayName = "CreateProjectDialog";
