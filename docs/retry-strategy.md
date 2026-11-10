# Retry strategy

HookLab retries are **owned by PostgreSQL**, not BullMQ.

## Schedule (default)

| Attempt | Delay before try |
|---------|------------------|
| 1 | immediate |
| 2 | 5s |
| 3 | 15s |
| 4 | 45s |
| 5 | 2m |

Configure with `DELIVERY_MAX_ATTEMPTS` (default `5`).

## Retryable errors

| Condition | Retry? |
|-----------|--------|
| Network / timeout (no status) | yes |
| HTTP 408, 429 | yes |
| HTTP 5xx | yes |
| HTTP 4xx (except 408/429) | no |

## Flow

1. Worker HTTP attempt fails (retryable).
2. Delivery → `retrying`, `nextRetryAt` set.
3. New **outbox** row with `availableAt = nextRetryAt`.
4. Dispatcher enqueues when due.
5. After max attempts → `dead_lettered`.

BullMQ `attempts` remains **1** per job — each try is a fresh outbox-driven job.
