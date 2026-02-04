#!/usr/bin/env bash
# Deployment script for RAG Chatbot
# Requirements: 12.3

set -e

echo "=== RAG Chatbot Deployment ==="

# 1. Install dependencies
echo "Installing dependencies..."
bun install --frozen-lockfile

# 2. Generate Prisma client
echo "Generating Prisma client..."
bunx prisma generate

# 3. Run migrations (optional: skip in CI, run manually in production)
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  bunx prisma migrate deploy
fi

# 4. Build
echo "Building application..."
bun run build

echo "=== Build complete. Start with: bun run start ==="
