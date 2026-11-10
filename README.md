# HookLab

Self-hosted webhook delivery: durable events, transactional outbox, signed HTTP delivery, retries, dead-letter/replay, and an operations dashboard.

## Quick start

```powershell
npm install
copy .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
```

| Process | Command |
|---------|---------|
| Sample subscriber | `npm run dev:consumer` |
| API | `npm run dev:api` |
| Outbox dispatcher | `npm run dev:dispatcher` |
| Delivery worker | `npm run dev:worker` |
| Dashboard (optional) | `npm run dev:dashboard` |

For local URLs such as `http://127.0.0.1:4000/webhooks`, set `WEBHOOK_ALLOW_LOCALHOST=1` in `.env`. Put the seeded `hl_live_…` key in the dashboard **Settings** page.

### Docker (API + worker + dispatcher)

```powershell
docker compose -f docker-compose.yml -f docker-compose.app.yml up --build
```

See [docs/deployment.md](docs/deployment.md).

## Tests

```powershell
npm test
```

## Documentation

| Doc | Topic |
|-----|--------|
| [overview.md](docs/overview.md) | Components, entities, doc map |
| [architecture.md](docs/architecture.md) | Diagrams and data ownership |
| [event-lifecycle.md](docs/event-lifecycle.md) | Publish → deliver flow |
| [webhook-delivery.md](docs/webhook-delivery.md) | Worker HTTP path |
| [retry-strategy.md](docs/retry-strategy.md) | Backoff and outbox retries |
| [failure-scenarios.md](docs/failure-scenarios.md) | Recovery and replay |
| [dashboard.md](docs/dashboard.md) | React UI |
| [security.md](docs/security.md) | HMAC, SSRF, rate limits |
| [deployment.md](docs/deployment.md) | Container layout |
| [local-development.md](docs/local-development.md) | Environment and TLS notes |
