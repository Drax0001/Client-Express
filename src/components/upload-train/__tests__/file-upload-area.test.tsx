/**
 * FileUploadArea Tests
 * Tests for the enhanced file upload component
 */

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FileUploadArea } from "../file-upload-area"

// Mock File API
const mockFile = (name: string, size: number, type: string): File => {
  return new File(['test content'], name, { type, size })
}

describe("FileUploadArea", () => {
  const mockOnFilesChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders upload area", () => {
    render(
      <FileUploadArea
        files={[]}
        onFilesChange={mockOnFilesChange}
      />
    )

    expect(screen.getByText("Upload documents")).toBeInTheDocument()
    expect(screen.getByText("Choose Files")).toBeInTheDocument()
  })

  it("validates file types", async () => {
    render(
      <FileUploadArea
        files={[]}
        onFilesChange={mockOnFilesChange}
      />
    )

    const file = mockFile("test.exe", 1024, "application/x-msdownload")
    const input = screen.getByRole("presentation") // The drop zone

    // Create a mock dataTransfer
    const dataTransfer = {
      files: [file],
      types: ['Files'],
      getData: jest.fn(),
    }

    // Simulate drop event
    fireEvent.drop(input, { dataTransfer })

    await waitFor(() => {
      expect(mockOnFilesChange).toHaveBeenCalled()
      const calledFiles = mockOnFilesChange.mock.calls[0][0]
      expect(calledFiles[0].status).toBe('error')
      expect(calledFiles[0].validationErrors).toContain('File type not supported')
    })
  })

  it("accepts valid files", async () => {
    render(
      <FileUploadArea
        files={[]}
        onFilesChange={mockOnFilesChange}
      />
    )

    const file = mockFile("document.pdf", 1024, "application/pdf")
    const input = screen.getByRole("presentation")

    const dataTransfer = {
      files: [file],
      types: ['Files'],
      getData: jest.fn(),
    }

    fireEvent.drop(input, { dataTransfer })

    await waitFor(() => {
      expect(mockOnFilesChange).toHaveBeenCalled()
      const calledFiles = mockOnFilesChange.mock.calls[0][0]
      expect(calledFiles[0].status).toBe('ready')
      expect(calledFiles[0].validationErrors).toHaveLength(0)
    })
  })

  it("displays file list", () => {
    const files = [
      {
        id: "1",
        file: mockFile("test.pdf", 1024, "application/pdf"),
        status: 'ready' as const,
        validationErrors: [],
        metadata: {
          name: "test.pdf",
          size: 1024,
          type: "application/pdf",
          detectedType: "pdf"
        }
      }
    ]

    render(
      <FileUploadArea
        files={files}
        onFilesChange={mockOnFilesChange}
      />
    )

    expect(screen.getByText("test.pdf")).toBeInTheDocument()
    expect(screen.getByText("1.00 KB")).toBeInTheDocument()
  })

  it("removes files", () => {
    const files = [
      {
        id: "1",
        file: mockFile("test.pdf", 1024, "application/pdf"),
        status: 'ready' as const,
        validationErrors: [],
        metadata: {
          name: "test.pdf",
          size: 1024,
          type: "application/pdf",
          detectedType: "pdf"
        }
      }
    ]

    render(
      <FileUploadArea
        files={files}
        onFilesChange={mockOnFilesChange}
      />
    )

    const removeButton = screen.getByLabelText("Remove file")
    fireEvent.click(removeButton)

    expect(mockOnFilesChange).toHaveBeenCalledWith([])
  })

  it("respects max file limits", () => {
    render(
      <FileUploadArea
        files={[]}
        onFilesChange={mockOnFilesChange}
        maxFiles={1}
      />
    )

    const file1 = mockFile("test1.pdf", 1024, "application/pdf")
    const file2 = mockFile("test2.pdf", 1024, "application/pdf")
    const input = screen.getByRole("presentation")

    const dataTransfer = {
      files: [file1, file2],
      types: ['Files'],
      getData: jest.fn(),
    }

    fireEvent.drop(input, { dataTransfer })

    expect(mockOnFilesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ metadata: expect.objectContaining({ name: "test1.pdf" }) })
      ])
    )
  })
})