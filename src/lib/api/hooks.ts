/**
 * API Hooks - TanStack Query hooks for backend API endpoints
 * Provides React hooks for all CRUD operations with proper error handling
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "./client"
import {
  Project,
  GetProjectResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  DeleteProjectResponse,
  Document,
  UploadDocumentRequest,
  UploadDocumentResponse,
  ChatRequest,
  ChatResponse,
  queryKeys,
  mutationKeys,
} from "./types"

// ======================================
// PROJECT HOOKS
// ======================================

/**
 * Fetch all projects
 */
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<Project[]> => {
      const response = await apiClient.get("/projects")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch a single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async (): Promise<GetProjectResponse> => {
      const response = await apiClient.get(`/projects/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.createProject],
    mutationFn: async (data: CreateProjectRequest): Promise<CreateProjectResponse> => {
      const response = await apiClient.post("/projects", data)
      return response.data
    },
    onSuccess: (newProject) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })

      toast({
        title: "Project created",
        description: `"${newProject.name}" has been created successfully.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error.error?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
  })
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.deleteProject],
    mutationFn: async (id: string): Promise<DeleteProjectResponse> => {
      const response = await apiClient.delete(`/projects/${id}`)
      return response.data
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.project(deletedId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })

      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete project",
        description: error.error?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    },
  })
}

// ======================================
// DOCUMENT HOOKS
// ======================================

/**
 * Upload a document to a project
 * Note: This uses FormData for multipart uploads
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.uploadDocument],
    mutationFn: async (data: UploadDocumentRequest): Promise<UploadDocumentResponse> => {
      const formData = new FormData()

      // Add projectId
      formData.append("projectId", data.projectId)

      // Add file or URL
      if (data.file) {
        console.log("API Hook: Appending file:", {
          name: data.file.name,
          size: data.file.size,
          type: data.file.type,
        });
        formData.append("file", data.file)
      } else if (data.url) {
        console.log("API Hook: Appending URL:", data.url);
        formData.append("url", data.url)
      }

      console.log("API Hook: Sending FormData to /documents/upload");
      const response = await apiClient.post("/documents/upload", formData)

      return response.data
    },
    onSuccess: (uploadedDoc) => {
      // Invalidate project data to update document count
      queryClient.invalidateQueries({ queryKey: queryKeys.project(uploadedDoc.projectId) })

      toast({
        title: "Document uploaded",
        description: `"${uploadedDoc.filename}" is being processed.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.error?.message || "Failed to upload document.",
        variant: "destructive",
      })
    },
  })
}

// ======================================
// CHAT HOOKS
// ======================================

/**
 * Send a chat message
 */
export function useSendChatMessage() {
  return useMutation({
    mutationKey: [mutationKeys.sendChatMessage],
    mutationFn: async (data: ChatRequest): Promise<ChatResponse> => {
      const response = await apiClient.post("/chat", data)
      return response.data
    },
    onError: (error: any) => {
      toast({
        title: "Chat failed",
        description: error.error?.message || "Failed to send message.",
        variant: "destructive",
      })
    },
  })
}

// ======================================
// UTILITY HOOKS
// ======================================

/**
 * Prefetch project data for better UX
 */
export function usePrefetchProject(id: string) {
  const queryClient = useQueryClient()

  const prefetch = async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.project(id),
      queryFn: async (): Promise<GetProjectResponse> => {
        const response = await apiClient.get(`/projects/${id}`)
        return response.data
      },
      staleTime: 2 * 60 * 1000,
    })
  }

  return prefetch
}

/**
 * Optimistically update project data
 */
export function useOptimisticProjectUpdate() {
  const queryClient = useQueryClient()

  const updateProject = (id: string, updates: Partial<Project>) => {
    queryClient.setQueryData(queryKeys.project(id), (oldData: GetProjectResponse | undefined) => {
      if (!oldData) return oldData
      return { ...oldData, ...updates }
    })
  }

  return updateProject
}