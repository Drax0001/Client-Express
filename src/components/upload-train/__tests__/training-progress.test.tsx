/**
 * TrainingProgress Tests
 * Tests for the training progress component
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import { TrainingProgress } from "../training-progress"

describe("TrainingProgress", () => {
  const mockProgress = {
    trainingId: "training-123",
    status: 'processing' as const,
    currentStep: 'embedding' as const,
    progress: 75,
    currentFile: "document.pdf",
    errors: [],
    estimatedTimeRemaining: 300,
    startedAt: new Date(),
  }

  const mockOnCancel = jest.fn()
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders progress information", () => {
    render(
      <TrainingProgress
        progress={mockProgress}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("Training")).toBeInTheDocument()
    expect(screen.getByText("75%")).toBeInTheDocument()
    expect(screen.getByText("Generating Embeddings")).toBeInTheDocument()
  })

  it("displays current step details", () => {
    render(
      <TrainingProgress
        progress={mockProgress}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("Creating vector representations")).toBeInTheDocument()
    expect(screen.getByText("document.pdf")).toBeInTheDocument()
  })

  it("shows time estimation", () => {
    render(
      <TrainingProgress
        progress={mockProgress}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("~5m 0s remaining")).toBeInTheDocument()
  })

  it("displays step progress", () => {
    render(
      <TrainingProgress
        progress={mockProgress}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("Training Steps")).toBeInTheDocument()
    expect(screen.getByText("Uploading Files")).toBeInTheDocument()
    expect(screen.getByText("Generating Embeddings")).toBeInTheDocument()
  })

  it("shows cancel button for processing status", () => {
    render(
      <TrainingProgress
        progress={mockProgress}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText("Cancel")
    expect(cancelButton).toBeInTheDocument()

    cancelButton.click()
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it("shows retry button for failed status", () => {
    const failedProgress = {
      ...mockProgress,
      status: 'failed' as const,
      errors: ["Embedding generation failed"],
    }

    render(
      <TrainingProgress
        progress={failedProgress}
        onRetry={mockOnRetry}
      />
    )

    expect(screen.getByText("Failed")).toBeInTheDocument()
    expect(screen.getByText("Embedding generation failed")).toBeInTheDocument()

    const retryButton = screen.getByText("Retry")
    expect(retryButton).toBeInTheDocument()

    retryButton.click()
    expect(mockOnRetry).toHaveBeenCalled()
  })

  it("displays completion message", () => {
    const completedProgress = {
      ...mockProgress,
      status: 'completed' as const,
      completedAt: new Date(),
    }

    render(
      <TrainingProgress
        progress={completedProgress}
      />
    )

    expect(screen.getByText("Completed")).toBeInTheDocument()
    expect(screen.getByText("Training Complete!")).toBeInTheDocument()
  })

  it("handles queued status", () => {
    const queuedProgress = {
      ...mockProgress,
      status: 'queued' as const,
    }

    render(
      <TrainingProgress
        progress={queuedProgress}
      />
    )

    expect(screen.getByText("Queued")).toBeInTheDocument()
    expect(screen.getByText("Waiting to start training")).toBeInTheDocument()
  })

  it("handles cancelled status", () => {
    const cancelledProgress = {
      ...mockProgress,
      status: 'cancelled' as const,
    }

    render(
      <TrainingProgress
        progress={cancelledProgress}
      />
    )

    expect(screen.getByText("Cancelled")).toBeInTheDocument()
    expect(screen.getByText("Training was stopped")).toBeInTheDocument()
  })

  it("displays training ID", () => {
    render(
      <TrainingProgress
        progress={mockProgress}
      />
    )

    expect(screen.getByText("training-123".slice(-8))).toBeInTheDocument()
  })

  it("shows multiple errors", () => {
    const errorProgress = {
      ...mockProgress,
      status: 'failed' as const,
      errors: ["Error 1", "Error 2", "Error 3"],
    }

    render(
      <TrainingProgress
        progress={errorProgress}
        onRetry={mockOnRetry}
      />
    )

    expect(screen.getByText("Error 1")).toBeInTheDocument()
    expect(screen.getByText("Error 2")).toBeInTheDocument()
    expect(screen.getByText("Error 3")).toBeInTheDocument()
  })
})