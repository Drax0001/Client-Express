/**
 * UrlUploadInput Tests
 * Tests for the enhanced URL upload component
 */

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { UrlUploadInput } from "../url-upload-input"

// Mock fetch
global.fetch = jest.fn()

describe("UrlUploadInput", () => {
  const mockOnUrlsChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it("renders URL input", () => {
    render(
      <UrlUploadInput
        urls={[]}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    expect(screen.getByText("Document URLs")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("https://example.com/document.pdf")).toBeInTheDocument()
  })

  it("validates URL format", async () => {
    render(
      <UrlUploadInput
        urls={[]}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    const input = screen.getByPlaceholderText("https://example.com/document.pdf")
    const button = screen.getByText("Add URL")

    fireEvent.change(input, { target: { value: "not-a-url" } })
    fireEvent.click(button)

    expect(screen.getByText("Please enter a valid HTTP or HTTPS URL")).toBeInTheDocument()
  })

  it("adds valid URLs", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/pdf'
            if (name === 'content-length') return '1024'
            return null
          }
        }
      })

    render(
      <UrlUploadInput
        urls={[]}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    const input = screen.getByPlaceholderText("https://example.com/document.pdf")
    const button = screen.getByText("Add URL")

    fireEvent.change(input, { target: { value: "https://example.com/test.pdf" } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockOnUrlsChange).toHaveBeenCalled()
      const calledUrls = mockOnUrlsChange.mock.calls[0][0]
      expect(calledUrls[0].url).toBe("https://example.com/test.pdf")
      expect(calledUrls[0].status).toBe('ready')
    })
  })

  it("handles URL validation failures", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(
      <UrlUploadInput
        urls={[]}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    const input = screen.getByPlaceholderText("https://example.com/document.pdf")
    const button = screen.getByText("Add URL")

    fireEvent.change(input, { target: { value: "https://example.com/invalid.pdf" } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockOnUrlsChange).toHaveBeenCalled()
      const calledUrls = mockOnUrlsChange.mock.calls[0][0]
      expect(calledUrls[0].status).toBe('error')
      expect(calledUrls[0].validationErrors[0]).toContain('Failed to validate URL')
    })
  })

  it("displays URL list", () => {
    const urls = [
      {
        id: "1",
        url: "https://example.com/test.pdf",
        status: 'ready' as const,
        validationErrors: [],
        metadata: {
          contentType: "application/pdf",
          size: 1024
        }
      }
    ]

    render(
      <UrlUploadInput
        urls={urls}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    expect(screen.getByText("https://example.com/test.pdf")).toBeInTheDocument()
    expect(screen.getByText("1.00 KB")).toBeInTheDocument()
  })

  it("removes URLs", () => {
    const urls = [
      {
        id: "1",
        url: "https://example.com/test.pdf",
        status: 'ready' as const,
        validationErrors: [],
      }
    ]

    render(
      <UrlUploadInput
        urls={urls}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    const removeButton = screen.getByLabelText("Remove URL")
    fireEvent.click(removeButton)

    expect(mockOnUrlsChange).toHaveBeenCalledWith([])
  })

  it("respects max URL limits", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      headers: {
        get: () => 'application/pdf'
      }
    })

    render(
      <UrlUploadInput
        urls={[]}
        onUrlsChange={mockOnUrlsChange}
        maxUrls={1}
      />
    )

    const input = screen.getByPlaceholderText("https://example.com/document.pdf")
    const button = screen.getByText("Add URL")

    // Try to add first URL
    fireEvent.change(input, { target: { value: "https://example.com/test1.pdf" } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockOnUrlsChange).toHaveBeenCalledTimes(1)
    })

    // Try to add second URL
    fireEvent.change(input, { target: { value: "https://example.com/test2.pdf" } })
    fireEvent.click(button)

    expect(screen.getByText("Maximum 1 URLs allowed")).toBeInTheDocument()
  })

  it("prevents duplicate URLs", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      headers: {
        get: () => 'application/pdf'
      }
    })

    render(
      <UrlUploadInput
        urls={[]}
        onUrlsChange={mockOnUrlsChange}
      />
    )

    const input = screen.getByPlaceholderText("https://example.com/document.pdf")
    const button = screen.getByText("Add URL")

    // Add first URL
    fireEvent.change(input, { target: { value: "https://example.com/test.pdf" } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockOnUrlsChange).toHaveBeenCalledTimes(1)
    })

    // Try to add the same URL again
    fireEvent.change(input, { target: { value: "https://example.com/test.pdf" } })
    fireEvent.click(button)

    expect(screen.getByText("This URL has already been added")).toBeInTheDocument()
  })
})