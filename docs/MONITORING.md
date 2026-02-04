# Monitoring and Maintenance

## Health Checks

- **API**: `GET /api/health` (add if needed) or rely on readiness of main routes.
- **Database**: Ensure `DATABASE_URL` is set and Prisma can connect.
- **ChromaDB**: Ensure `CHROMA_HOST` and `CHROMA_PORT` are reachable.

## Analytics

- **GET /api/analytics**: Training metrics and usage analytics (queries, tokens, by day).
- Use `?days=30` and `?type=training` or `?type=usage` to filter.

## Logs

- Application logs go to stdout. In production, capture them with your platform (e.g. Docker, Kubernetes, PM2).
- Audit events are logged with `[Audit]` prefix; see `src/lib/audit.ts`.

## Progress Streaming

- Training progress can be polled at `GET /api/train/{trainingId}/progress`.
- Real-time stream: `GET /api/train/{trainingId}/progress/stream` (Server-Sent Events).

## Maintenance

- Prisma: `bunx prisma migrate deploy` for new migrations.
- ChromaDB: Backup persistence directory if using file-based storage.
- Rate limit and audit buffers are in-memory; they reset on process restart.
