# Queue layer

HookLab uses **BullMQ** on **Redis** for asynchronous webhook delivery jobs.

## Queue

| Property | Value |
|----------|--------|
| Name | `webhook-deliveries` |
| Job name | `deliver` |
| Job ID | Same as `deliveryId` (dedupes re-enqueue) |
| Payload | `{ "deliveryId": "dlv_…" }` |

## Processes

| Process | Role |
|---------|------|
| **API** | Transaction: deliveries + `outbox_events` (status `pending`) |
| **Dispatcher** | Reads outbox → enqueue BullMQ → mark outbox `published` |
| **Worker** | BullMQ consumer → `processDelivery(deliveryId)` |

The API does not enqueue Redis jobs directly; the dispatcher reads the outbox.

## BullMQ vs PostgreSQL retries

BullMQ jobs use `attempts: 1`. Retry delays and dead-letter state live in PostgreSQL so two schedulers do not compete.

## Outbox claim states

`pending` → `publishing` → `published` (or back to `pending` on Redis error)

Retries create new outbox rows with `availableAt = nextRetryAt`.

## Metrics

`GET /api/v1/metrics` (authenticated) returns:

- Redis queue: `waiting`, `active`, `completed`, `failed`, `delayed`
- Delivery counts by status for the organization

## Configuration

| Variable | Default |
|----------|---------|
| `REDIS_URL` | `redis://127.0.0.1:6379` |
| `WORKER_CONCURRENCY` | `5` |
| `DELIVERY_TIMEOUT_MS` | `10000` |
