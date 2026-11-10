# Architecture

HookLab is a **modular monolith**: one TypeScript repo, several **independent Node processes**, shared libraries, and **PostgreSQL as the source of truth** for events and delivery state. Redis/BullMQ is a **transport layer**, not the system of record.

## System context

```mermaid
flowchart TB
  subgraph clients [Clients]
    App[Your application]
    Dash[React dashboard]
    Prod[examples/event-producer]
  end

  subgraph hooklab [HookLab processes]
    API[apps/api]
    DISP[apps/dispatcher]
    WRK[apps/worker]
  end

  subgraph data [Infrastructure]
    PG[(PostgreSQL)]
    RQ[(Redis / BullMQ)]
  end

  subgraph subs [Subscribers]
    CONS[examples/webhook-consumer]
    EXT[Customer HTTPS endpoints]
  end

  App -->|Bearer API key| API
  Dash -->|Bearer API key| API
  Prod --> API

  API --> PG
  DISP --> PG
  DISP --> RQ
  WRK --> RQ
  WRK --> PG
  WRK -->|signed POST| CONS
  WRK -->|signed POST| EXT
```

## End-to-end delivery path

```mermaid
sequenceDiagram
  participant C as Client
  participant API as API
  participant PG as PostgreSQL
  participant D as Dispatcher
  participant Q as BullMQ
  participant W as Worker
  participant S as Subscriber

  C->>API: POST /api/v1/events
  API->>PG: TX: event + deliveries + outbox
  API-->>C: 202 Accepted

  loop Poll outbox
    D->>PG: claim outbox rows
    D->>Q: enqueue job deliveryId
    D->>PG: mark published
  end

  Q->>W: job deliveryId
  W->>PG: claim delivery processing
  W->>PG: load event + endpoint secret
  W->>S: POST webhook HMAC
  W->>PG: attempt row + status update
```

**Guarantee:** at-least-once **execution** inside HookLab (retries, duplicate jobs tolerated). **Exactly-once HTTP delivery** to arbitrary subscribers is not claimed.

## Components (jist)

| Piece | Path | Role |
|-------|------|------|
| **API** | `apps/api` | Auth, register endpoints, publish events, list deliveries/attempts, replay, metrics, health |
| **Dispatcher** | `apps/dispatcher` | Transactional **outbox** → enqueue `webhook-deliveries` jobs idempotently |
| **Worker** | `apps/worker` | Claim delivery, HTTP POST, HMAC, record attempts, retries via outbox |
| **Dashboard** | `apps/dashboard` | Vite/React UI over the same REST API |
| **Shared** | `packages/shared` | Types, validation, HMAC, retry math, SSRF checks, `deliverWebhook` |
| **Queue** | `packages/queue` | BullMQ publisher/worker helpers, Redis ping |
| **Consumer** | `examples/webhook-consumer` | Reference subscriber (verify signature, idempotent by event id) |
| **Producer** | `examples/event-producer` | CLI to publish via HookLab API or direct POST |

## Repository layout

```
hooklab/
├── apps/
│   ├── api/           # Fastify REST
│   ├── dispatcher/    # Outbox poller
│   ├── worker/        # Delivery executor
│   └── dashboard/     # React console
├── packages/
│   ├── shared/        # Domain + delivery HTTP
│   └── queue/         # BullMQ integration
├── examples/          # Learning & E2E demos
├── prisma/            # Schema + migrations
├── docs/              # Deep dives per topic
├── Dockerfile         # Shared image for app processes
├── docker-compose.yml # Postgres + Redis
└── docker-compose.app.yml
```

## Data ownership

| Concern | Authoritative store |
|---------|---------------------|
| Events, endpoints, deliveries, attempts | PostgreSQL |
| Retry schedule, dead-letter, replay | PostgreSQL (`next_retry_at`, outbox rows) |
| In-flight job queue | Redis (BullMQ); jobs keyed by `deliveryId` |
| API keys | SHA-256 hash in `organizations` |
| Endpoint signing secrets | AES-256-GCM ciphertext in DB |

## Cross-cutting concerns

| Topic | Where | Doc |
|-------|--------|-----|
| Outbox + retries | API TX, dispatcher, worker | [retry-strategy.md](retry-strategy.md) |
| Idempotency | Publish header + delivery claim | [idempotency.md](idempotency.md) |
| HMAC + SSRF | `packages/shared`, worker | [security.md](security.md) |
| Leases & recovery | Worker + dispatcher loops | [failure-scenarios.md](failure-scenarios.md) |
| Schema | Prisma | [database-design.md](database-design.md) |

## Local vs Docker

- **Dev:** `npm run dev:*` on the host; Postgres/Redis in Compose; consumer on `:4000`.
- **App tier:** optional `docker-compose.app.yml` runs API, dispatcher, worker in one image ([deployment.md](deployment.md)).

## Mental model

1. **Publish** = durable commit in Postgres (never block on HTTP to subscribers).
2. **Dispatch** = bridge committed work to Redis safely (repeatable).
3. **Deliver** = worker owns one delivery at a time; Postgres records every attempt.
4. **Observe** = dashboard + metrics + delivery attempt APIs.

Further reading: [overview.md](overview.md) (doc index + glossary).
