# Overview

## What HookLab does

1. Register webhook endpoints and subscribed event types.
2. Publish events through the HTTP API.
3. Fan out deliveries, enqueue work via the outbox, POST signed JSON, retry with backoff, dead-letter when exhausted.
4. Inspect history and replay failures via the API or dashboard.

## Processes

| Command | Role |
|---------|------|
| `docker compose up -d` | PostgreSQL and Redis |
| `npm run dev:api` | REST API, auth, persistence |
| `npm run dev:dispatcher` | Outbox → BullMQ |
| `npm run dev:worker` | HTTP delivery and status updates |
| `npm run dev:consumer` | Reference subscriber (dev) |
| `npm run dev:dashboard` | Operations UI |

## Core entities

| Entity | ID prefix | Purpose |
|--------|-----------|---------|
| Organization | `org_` | Tenant; API key stored as hash |
| Webhook endpoint | `ep_` | URL, subscriptions, encrypted signing secret |
| Event | `evt_` | Published payload |
| Delivery | `dlv_` | One event delivered to one endpoint |
| Delivery attempt | `dat_` | Single HTTP try |
| Outbox row | `obx_` | Work item for the dispatcher |

**Delivery statuses:** `pending` → `processing` → `succeeded` | `retrying` → … → `dead_lettered` | `failed`

## Packages

```
@hooklab/shared   — validation, HMAC, SSRF, deliverWebhook
@hooklab/queue    — BullMQ helpers
apps/api          — ingress only (no subscriber HTTP in-request)
apps/dispatcher   — outbox poller
apps/worker       — delivery executor
```

`shared` does not depend on `apps`; `queue` does not use Prisma.

## Documentation

| Doc | Subject |
|-----|---------|
| [architecture.md](architecture.md) | System layout |
| [event-lifecycle.md](event-lifecycle.md) | End-to-end flow |
| [database-design.md](database-design.md) | Schema and encryption |
| [webhook-delivery.md](webhook-delivery.md) | Outbound HTTP |
| [queue.md](queue.md) | Redis and BullMQ |
| [retry-strategy.md](retry-strategy.md) | Backoff |
| [idempotency.md](idempotency.md) | Publish and processing dedupe |
| [failure-scenarios.md](failure-scenarios.md) | Duplicates and recovery |
| [security.md](security.md) | HMAC, SSRF, limits |
| [dashboard.md](dashboard.md) | Web UI |
| [deployment.md](deployment.md) | Docker |
| [local-development.md](local-development.md) | `.env`, corporate TLS |

## Smoke test

With all processes running and `WEBHOOK_ALLOW_LOCALHOST=1`: register the sample consumer URL, publish `task.completed`, confirm `succeeded` in the dashboard, then exercise retry/replay if needed.
