# RAG Chatbot – User Guide

## Overview

Create custom AI chatbots trained on your documents (PDF, DOCX, TXT, URLs). The chatbot answers only from your content.

## Quick Start

1. **Create a chatbot** – Go to **Upload** → add files or URLs → configure training → start training.
2. **Chat** – When training completes, open the chatbot and ask questions.
3. **Manage** – List, filter, and delete chatbots from the **Chatbots** page.

## Upload & Train

- **Upload**: Drag-and-drop files or paste URLs. Supported: PDF, DOCX, TXT, HTML, Markdown.
- **Configure**: Set chunk size, overlap, and model options. Use presets for quick setup.
- **Train**: Progress is shown in real time. You can stream progress via SSE at `/api/train/{id}/progress/stream`.

## Chat

- Messages are scoped to the selected chatbot and its trained documents.
- Conversations are saved. List them under each chatbot and open any to see history.
- Use **Clear conversation** or **Export** from the chat menu.

## API Reference

- **Interactive docs**: Open `/reference` (Scalar API Reference).
- **OpenAPI spec**: `GET /api/openapi` returns the OpenAPI 3.1 spec.

## Limits

- File size and count limits apply per upload session (see Upload UI).
- Rate limits apply to API requests (see rate-limit headers when applicable).
