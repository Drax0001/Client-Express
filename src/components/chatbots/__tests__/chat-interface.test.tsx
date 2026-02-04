/**
 * ChatInterface Tests
 * Tests for the chat interface component
 */

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ChatInterface } from "../chat-interface"

const mockMessages = [
  {
    id: "msg-1",
    role: "user" as const,
    content: "Hello, how can you help me?",
    timestamp: new Date("2024-01-20T10:00:00Z"),
  },
  {
    id: "msg-2",
    role: "assistant" as const,
    content: "I can help you with questions about your uploaded documents.",
    timestamp: new Date("2024-01-20T10:00:05Z"),
    sources: [
      {
        id: "source-1",
        title: "Company Handbook",
        url: "https://example.com/handbook.pdf",
        snippet: "This section covers employee benefits and policies...",
        relevanceScore: 0.85,
      },
    ],
    tokensUsed: 45,
    responseTime: 1200,
  },
]

const mockHandlers = {
  onSendMessage: jest.fn(),
  onClearConversation: jest.fn(),
  onExportConversation: jest.fn(),
  onRateMessage: jest.fn(),
}

describe("ChatInterface", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("renders chat interface with header", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={[]}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Test Bot")).toBeInTheDocument()
    expect(screen.getByText("Ask me anything about your documents")).toBeInTheDocument()
  })

  it("displays messages correctly", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Hello, how can you help me?")).toBeInTheDocument()
    expect(screen.getByText("I can help you with questions about your uploaded documents.")).toBeInTheDocument()
  })

  it("shows sources for assistant messages", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Company Handbook")).toBeInTheDocument()
    expect(screen.getByText("85% relevant")).toBeInTheDocument()
  })

  it("displays message metadata", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("45 tokens")).toBeInTheDocument()
    expect(screen.getByText("1200ms")).toBeInTheDocument()
  })

  it("shows typing indicator when loading", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        isLoading={true}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Test Bot is typing")).toBeInTheDocument()
  })

  it("sends message on button click", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={[]}
        {...mockHandlers}
      />
    )

    const input = screen.getByPlaceholderText("Ask Test Bot a question...")
    const sendButton = screen.getByLabelText("Send message")

    fireEvent.change(input, { target: { value: "Test message" } })
    fireEvent.click(sendButton)

    expect(mockHandlers.onSendMessage).toHaveBeenCalledWith("Test message")
  })

  it("sends message on Enter key", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={[]}
        {...mockHandlers}
      />
    )

    const input = screen.getByPlaceholderText("Ask Test Bot a question...")

    fireEvent.change(input, { target: { value: "Test message" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(mockHandlers.onSendMessage).toHaveBeenCalledWith("Test message")
  })

  it("prevents sending empty messages", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={[]}
        {...mockHandlers}
      />
    )

    const sendButton = screen.getByLabelText("Send message")
    fireEvent.click(sendButton)

    expect(mockHandlers.onSendMessage).not.toHaveBeenCalled()
  })

  it("auto-resizes textarea", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={[]}
        {...mockHandlers}
      />
    )

    const textarea = screen.getByPlaceholderText("Ask Test Bot a question...")

    // Simulate typing a long message
    const longMessage = "This is a very long message that should cause the textarea to resize and expand to accommodate the additional text content."
    fireEvent.change(textarea, { target: { value: longMessage } })

    // The textarea should have resized (we can't directly test scrollHeight, but we can verify the change event was handled)
    expect(textarea).toHaveValue(longMessage)
  })

  it("copies message to clipboard", async () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        {...mockHandlers}
      />
    )

    // Find and click copy button (it appears on hover, so we need to simulate that)
    const copyButtons = screen.getAllByLabelText("Copy message")
    fireEvent.click(copyButtons[1]) // Copy the assistant message

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "I can help you with questions about your uploaded documents."
      )
    })
  })

  it("shows empty state when no messages", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={[]}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Start a conversation")).toBeInTheDocument()
    expect(screen.getByText("Ask Test Bot anything about your uploaded documents.")).toBeInTheDocument()
  })

  it("handles conversation actions", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        {...mockHandlers}
      />
    )

    // Click the more options button
    const moreButton = screen.getByLabelText("Conversation options")
    fireEvent.click(moreButton)

    // Should show dropdown menu
    expect(screen.getByText("Export Conversation")).toBeInTheDocument()
    expect(screen.getByText("Clear Conversation")).toBeInTheDocument()
  })

  it("rates messages", () => {
    render(
      <ChatInterface
        chatbotId="chatbot-1"
        chatbotName="Test Bot"
        messages={mockMessages}
        {...mockHandlers}
      />
    )

    const thumbsUpButtons = screen.getAllByLabelText("Rate positive")
    fireEvent.click(thumbsUpButtons[0])

    expect(mockHandlers.onRateMessage).toHaveBeenCalledWith("msg-2", "positive")
  })
})