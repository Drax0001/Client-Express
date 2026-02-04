/**
 * ChatbotManagement Tests
 * Tests for the chatbot management component
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChatbotManagement } from "../chatbot-management"

const mockChatbots = [
  {
    id: "chatbot-1",
    name: "Finance Assistant",
    description: "Helps with financial queries",
    status: "ready" as const,
    documentCount: 5,
    queryCount: 150,
    totalTokens: 25000,
    lastQueriedAt: "2024-01-20T10:00:00Z",
    createdAt: "2024-01-15T08:00:00Z",
    statistics: {
      completedTrainings: 1,
      totalConversations: 12,
      totalMessages: 45,
      averageMessagesPerConversation: 3.75,
      lastActivity: "2024-01-20T10:00:00Z",
    },
  },
  {
    id: "chatbot-2",
    name: "HR Bot",
    status: "training" as const,
    documentCount: 3,
    queryCount: 0,
    totalTokens: 0,
    createdAt: "2024-01-18T14:00:00Z",
    statistics: {
      completedTrainings: 0,
      totalConversations: 0,
      totalMessages: 0,
      averageMessagesPerConversation: 0,
      lastActivity: undefined,
    },
  },
]

const mockHandlers = {
  onSearch: jest.fn(),
  onFilter: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onChat: jest.fn(),
  onViewStats: jest.fn(),
}

describe("ChatbotManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders chatbot grid by default", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Finance Assistant")).toBeInTheDocument()
    expect(screen.getByText("HR Bot")).toBeInTheDocument()
    expect(screen.getByText("Helps with financial queries")).toBeInTheDocument()
  })

  it("switches between grid and list view", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    const listButton = screen.getByLabelText("List view")
    fireEvent.click(listButton)

    // Should show list-specific elements
    expect(screen.getAllByText("docs")).toHaveLength(2) // Document count labels
  })

  it("filters chatbots by status", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    // The select should be present for status filtering
    expect(screen.getByText("All Status")).toBeInTheDocument()
  })

  it("searches chatbots", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    const searchInput = screen.getByPlaceholderText("Search chatbots...")
    fireEvent.change(searchInput, { target: { value: "Finance" } })

    expect(mockHandlers.onSearch).toHaveBeenCalledWith("Finance")
  })

  it("shows loading state", () => {
    render(
      <ChatbotManagement
        chatbots={[]}
        loading={true}
        {...mockHandlers}
      />
    )

    // Should show skeleton loaders
    expect(screen.getAllByRole("presentation")).toHaveLength(6) // 6 skeleton cards
  })

  it("shows empty state", () => {
    render(
      <ChatbotManagement
        chatbots={[]}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("No chatbots found")).toBeInTheDocument()
  })

  it("displays chatbot statistics", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("150")).toBeInTheDocument() // Query count
    expect(screen.getByText("5 documents")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument() // Conversation count
  })

  it("handles action buttons", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    // Click on the first chatbot's actions menu
    const actionButtons = screen.getAllByLabelText("Actions")
    fireEvent.click(actionButtons[0])

    // Should show dropdown menu items
    expect(screen.getByText("Start Chat")).toBeInTheDocument()
    expect(screen.getByText("View Statistics")).toBeInTheDocument()
    expect(screen.getByText("Edit")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("shows summary statistics", () => {
    render(
      <ChatbotManagement
        chatbots={mockChatbots}
        {...mockHandlers}
      />
    )

    expect(screen.getByText("Showing 2 chatbot")).toBeInTheDocument()
    expect(screen.getByText("1 ready")).toBeInTheDocument()
    expect(screen.getByText("1 training")).toBeInTheDocument()
    expect(screen.getByText("Total queries: 150")).toBeInTheDocument()
  })
})