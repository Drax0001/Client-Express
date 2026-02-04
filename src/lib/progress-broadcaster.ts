/**
 * Progress Broadcaster - Server-Sent Events for training progress
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface TrainingProgressEvent {
  trainingId: string
  status: string
  currentStep: string
  progress: number
  currentFile?: string
  errors: string[]
  estimatedTimeRemaining?: number
  startedAt?: string
  completedAt?: string
  timestamp: number
}

type Listener = (event: TrainingProgressEvent) => void

const listeners = new Map<string, Set<Listener>>()

/**
 * Subscribe to progress updates for a training session
 */
export function subscribeToProgress(trainingId: string, listener: Listener): () => void {
  if (!listeners.has(trainingId)) {
    listeners.set(trainingId, new Set())
  }
  listeners.get(trainingId)!.add(listener)

  return () => {
    const set = listeners.get(trainingId)
    if (set) {
      set.delete(listener)
      if (set.size === 0) listeners.delete(trainingId)
    }
  }
}

/**
 * Broadcast progress update to all subscribers
 */
export function broadcastProgress(trainingId: string, event: Omit<TrainingProgressEvent, "trainingId" | "timestamp">): void {
  const fullEvent: TrainingProgressEvent = {
    ...event,
    trainingId,
    timestamp: Date.now(),
  }
  const set = listeners.get(trainingId)
  if (set) {
    set.forEach((listener) => {
      try {
        listener(fullEvent)
      } catch (err) {
        console.error("Progress broadcaster listener error:", err)
      }
    })
  }
}

/**
 * Get subscriber count for a training (for debugging)
 */
export function getSubscriberCount(trainingId: string): number {
  return listeners.get(trainingId)?.size ?? 0
}
