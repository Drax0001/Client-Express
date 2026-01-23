import { Skeleton } from "@/components/ui/skeleton"

// Project card skeleton
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>

      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>

      <Skeleton className="h-3 w-28" />
    </div>
  )
}

// Document list skeleton
export function DocumentListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Message skeleton
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 max-w-4xl mr-auto">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-64 rounded-2xl rounded-bl-md" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// Upload progress skeleton
export function UploadProgressSkeleton() {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-start gap-3">
        <Skeleton className="h-4 w-4 rounded flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-full rounded" />
        </div>
        <Skeleton className="h-8 w-16 rounded" />
      </div>
    </div>
  )
}