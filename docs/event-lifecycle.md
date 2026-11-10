# Event lifecycle

HookLab separates **accepting** an event from **delivering** it. The API returns as soon as the database transaction commits; subscribers are notified asynchronously.

## Full pipeline (current)

```mermaid
stateDiagram-v2
  [*] --> accepted: POST /api/v1/events
  accepted --> pending: fan-out deliveries + outbox
  pending --> processing: worker claim
  processing --> succeeded: HTTP 2xx
  processing --> retrying: retryable failure
  retrying --> pending: outbox re-enqueue
  processing --> failed: non-retryable error
  processing --> dead_lettered: max attempts
  dead_lettered --> pending: POST replay
```

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant PG as PostgreSQL
  participant Dispatcher
  participant Queue as BullMQ
  participant Worker
  participant Sub as Subscriber

  Client->>API: POST /events (+ optional Idempotency-Key)
  API->>PG: BEGIN: event, deliveries, outbox
  API->>PG: COMMIT
  API-->>Client: 202 { id, deliveriesCreated }

  Dispatcher->>PG: SELECT pending outbox (FOR UPDATE / lease)
  Dispatcher->>Queue: add job(deliveryId)
  Dispatcher->>PG: outbox = published

  Queue->>Worker: process deliveryId
  Worker->>PG: claim → processing
  Worker->>Sub: POST + HMAC
  Worker->>PG: delivery_attempt + terminal status
```

## Stages

| Stage | Where | What happens |
|-------|--------|----------------|
| **Authenticate** | API | `Authorization: Bearer hl_live_…` → organization |
| **Validate** | `@hooklab/shared` | Event type, `data` object, endpoint URLs (SSRF rules) |
| **Persist** | API + Prisma | Event row; one `webhook_deliveries` per matching endpoint |
| **Outbox** | Same transaction | `outbox_events` row per delivery to enqueue |
| **Dispatch** | `apps/dispatcher` | Publish to Redis; mark outbox published (idempotent) |
| **Claim** | `apps/worker` | One winner per delivery; stale `processing` recovered |
| **Deliver** | `deliverWebhook` | DNS SSRF check → POST → record attempt |
| **Retry** | Worker + PG | Schedule `next_retry_at`, new outbox row (not duplicate schedulers in Redis) |
| **Dead letter** | Worker | `attemptCount >= max` → `dead_lettered` |
| **Replay** | API | Manual `pending` + outbox; history preserved |

## Why HTTP 202?

`202 Accepted` means the event is **durably stored** and deliveries are **scheduled**. It does not mean subscribers have already received the webhook.

## Subscription matching

Fan-out predicate per endpoint:

- `enabled === true`
- `subscribedEvents` includes the published `type`

One publish with three matching endpoints → three delivery rows (same `eventId`, different `endpointId`).

## Idempotency (publish)

Same `Idempotency-Key` + same body → same `evt_*` id returned; no second event row ([idempotency.md](idempotency.md)).

## Idempotency (delivery)

- Terminal `succeeded` → worker skips further HTTP.
- Unique `(deliveryId, attemptNumber)` prevents duplicate attempt rows.
- Duplicate BullMQ jobs → second worker gets `skipped` on claim.

See [architecture.md](architecture.md) for component diagram.
