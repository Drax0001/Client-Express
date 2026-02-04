/**
 * GET /api/train/[trainingId]/progress/stream - Server-Sent Events for real-time progress
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest } from "next/server"
import { TrainingService } from "@/services/training.service"
import { subscribeToProgress } from "@/lib/progress-broadcaster"

const trainingService = new TrainingService()

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/train/[trainingId]/progress/stream
 * Streams training progress via Server-Sent Events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainingId: string }> }
) {
  const { trainingId } = await params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const sendError = (message: string) => {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`))
      }

      try {
        const progress = await trainingService.getTrainingProgress(trainingId)
        send({
          type: "progress",
          trainingId,
          ...progress,
          startedAt: progress.startedAt?.toISOString(),
          completedAt: progress.completedAt?.toISOString(),
        })

        if (progress.status === "completed" || progress.status === "failed" || progress.status === "cancelled") {
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
          controller.close()
          return
        }

        const unsubscribe = subscribeToProgress(trainingId, (event) => {
          send({
            type: "progress",
            ...event,
            startedAt: event.startedAt,
            completedAt: event.completedAt,
          })
          if (
            event.status === "completed" ||
            event.status === "failed" ||
            event.status === "cancelled"
          ) {
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"))
            unsubscribe()
            controller.close()
          }
        })

        request.signal.addEventListener("abort", () => {
          unsubscribe()
          controller.close()
        })
      } catch (err) {
        sendError(err instanceof Error ? err.message : "Unknown error")
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
