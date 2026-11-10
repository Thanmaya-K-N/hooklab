# HookLab

Self-hosted webhook delivery platform — learning project for reliable webhook delivery (outbox, retries, HMAC, dashboard).

## Milestone 10 (current): Production hardening

| Area | Implementation |
|------|----------------|
| **SSRF** | URL validation + DNS resolve check before every delivery; `WEBHOOK_ALLOW_LOCALHOST=1` for dev |
| **Rate limits** | `@fastify/rate-limit` on API (health exempt) |
| **Logging** | Request IDs on API (`x-request-id`) |
| **Docker** | `Dockerfile` + `docker-compose.app.yml` for API, worker, dispatcher |

Docs: [security.md](docs/security.md) · [deployment.md](docs/deployment.md)

## Quick start (local dev)

```powershell
npm install
copy .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
```

| Terminal | Command |
|----------|---------|
| Consumer | `npm run dev:consumer` |
| API | `npm run dev:api` |
| Dispatcher | `npm run dev:dispatcher` |
| Worker | `npm run dev:worker` |
| Dashboard | `npm run dev:dashboard` |

Set `WEBHOOK_ALLOW_LOCALHOST=1` (in `.env.example`) so `http://127.0.0.1:4000/webhooks` registers. Paste seeded API key in dashboard **Settings**.

## Docker app tier

```powershell
docker compose -f docker-compose.yml -f docker-compose.app.yml up --build
```

See [docs/deployment.md](docs/deployment.md).

## Tests

```powershell
npm test
```

## Definition of done

HookLab M1–M10 covers: durable events, outbox → BullMQ, signed delivery, retries/dead-letter/replay, failure recovery, dashboard, SSRF + rate limits, and containerized services.

## Documentation index

| Doc | Topic |
|-----|--------|
| [architecture.md](docs/architecture.md) | System shape |
| [webhook-delivery.md](docs/webhook-delivery.md) | Worker HTTP path |
| [retry-strategy.md](docs/retry-strategy.md) | Backoff + outbox |
| [failure-scenarios.md](docs/failure-scenarios.md) | Recovery drills |
| [dashboard.md](docs/dashboard.md) | React console |
| [security.md](docs/security.md) | HMAC + SSRF |
| [deployment.md](docs/deployment.md) | Docker |
| [local-development.md](docs/local-development.md) | Env & TLS notes |
