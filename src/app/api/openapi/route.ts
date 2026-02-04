/**
 * GET /api/openapi - OpenAPI 3.1 spec for API reference
 */

import { NextResponse } from "next/server"

const spec = {
  openapi: "3.1.0",
  info: {
    title: "RAG Chatbot Upload & Train API",
    description: "API for creating and managing AI chatbots trained on documents.",
    version: "1.0.0",
  },
  servers: [{ url: "/api", description: "API base" }],
  paths: {
    "/projects": {
      get: { summary: "List projects", tags: ["Projects"] },
      post: { summary: "Create project", tags: ["Projects"] },
    },
    "/projects/{id}": {
      get: { summary: "Get project", tags: ["Projects"] },
      delete: { summary: "Delete project", tags: ["Projects"] },
    },
    "/upload": {
      post: { summary: "Upload files and URLs", tags: ["Upload"] },
      get: { summary: "Get upload session", tags: ["Upload"] },
    },
    "/train": {
      post: { summary: "Start training", tags: ["Training"] },
    },
    "/train/{trainingId}/progress": {
      get: { summary: "Get training progress", tags: ["Training"] },
    },
    "/train/{trainingId}/progress/stream": {
      get: { summary: "Stream training progress (SSE)", tags: ["Training"] },
    },
    "/chatbots": { get: { summary: "List chatbots", tags: ["Chatbots"] } },
    "/chatbots/{id}": {
      get: { summary: "Get chatbot", tags: ["Chatbots"] },
      delete: { summary: "Delete chatbot", tags: ["Chatbots"] },
    },
    "/chatbots/{id}/conversations": {
      get: { summary: "List conversations", tags: ["Conversations"] },
    },
    "/chatbots/{id}/conversations/{conversationId}": {
      get: { summary: "Get conversation", tags: ["Conversations"] },
      delete: { summary: "Delete conversation", tags: ["Conversations"] },
    },
    "/chat": { post: { summary: "Send message to chatbot", tags: ["Chat"] } },
    "/analytics": { get: { summary: "Get analytics", tags: ["Analytics"] } },
  },
  tags: [
    { name: "Projects" },
    { name: "Upload" },
    { name: "Training" },
    { name: "Chatbots" },
    { name: "Conversations" },
    { name: "Chat" },
    { name: "Analytics" },
  ],
}

export async function GET() {
  return NextResponse.json(spec, {
    headers: { "Cache-Control": "public, max-age=3600" },
  })
}
