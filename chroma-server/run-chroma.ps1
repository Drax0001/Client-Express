$env:CHROMA_SERVER_CORS_ALLOW_ORIGINS = '["http://localhost:3000"]'
Write-Host "Starting ChromaDB on port 8000 (Local storage in ./chroma_db_data)..."
uv run chroma run --host 0.0.0.0 --port 8000 --path ./chroma_db_data
