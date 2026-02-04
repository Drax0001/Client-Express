/**
 * TrainingConfig Tests
 * Tests for the training configuration component
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { TrainingConfig } from "../training-config"

describe("TrainingConfig", () => {
  const mockConfig = {
    name: "Test Chatbot",
    description: "A test chatbot",
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: "gemini",
    temperature: 0.3,
    maxTokens: 1024,
  }

  const mockOnConfigChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders configuration form", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    expect(screen.getByText("Training Configuration")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Test Chatbot")).toBeInTheDocument()
    expect(screen.getByText("Chunk Size: 1000 characters")).toBeInTheDocument()
  })

  it("updates name field", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    const nameInput = screen.getByDisplayValue("Test Chatbot")
    fireEvent.change(nameInput, { target: { value: "Updated Chatbot" } })

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...mockConfig,
      name: "Updated Chatbot"
    })
  })

  it("updates description field", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    const descTextarea = screen.getByDisplayValue("A test chatbot")
    fireEvent.change(descTextarea, { target: { value: "Updated description" } })

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...mockConfig,
      description: "Updated description"
    })
  })

  it("applies quick presets", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    const technicalPreset = screen.getByText("Technical Documentation")
    fireEvent.click(technicalPreset)

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...mockConfig,
      chunkSize: 800,
      chunkOverlap: 150,
      temperature: 0.2,
      maxTokens: 2048,
    })
  })

  it("validates configuration", () => {
    const invalidConfig = {
      ...mockConfig,
      name: "",
      chunkSize: 100,
      temperature: 2.0,
    }

    render(
      <TrainingConfig
        config={invalidConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    expect(screen.getByText(/Chatbot name is required/)).toBeInTheDocument()
    expect(screen.getByText(/Chunk size must be between 500 and 2000/)).toBeInTheDocument()
    expect(screen.getByText(/Temperature must be between 0 and 1/)).toBeInTheDocument()
  })

  it("disables controls when disabled", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
        disabled={true}
      />
    )

    const nameInput = screen.getByDisplayValue("Test Chatbot")
    expect(nameInput).toBeDisabled()
  })

  it("shows configuration summary", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    expect(screen.getByText("Configuration Summary")).toBeInTheDocument()
    expect(screen.getByText("1000 chars • 200 overlap")).toBeInTheDocument()
    expect(screen.getByText("0.3 temp • 1024 tokens")).toBeInTheDocument()
  })

  it("displays token estimation", () => {
    render(
      <TrainingConfig
        config={mockConfig}
        onConfigChange={mockOnConfigChange}
      />
    )

    expect(screen.getByText("250 tokens/chunk")).toBeInTheDocument()
  })
})