# Failure scenarios

## Duplicate BullMQ jobs

- **Claim**: `updateMany` moves only `pending` / `retrying` / **stale** `processing` → `processing`.
- A second worker with the same delivery id gets `skipped` while the first holds a fresh lease.
- **Attempts**: unique `(deliveryId, attemptNumber)` rejects duplicate attempt rows.

## Worker crash mid-delivery

| State | Recovery |
|-------|----------|
| `processing` (stale) | Worker/dispatcher recovery → `retrying` + new outbox (`processing_lease_expired`) |
| Outbox `publishing` (stale) | Reset to `pending` for dispatcher retry |

Configure `PROCESSING_LEASE_MS` (default 120s) and `OUTBOX_PUBLISHING_LEASE_MS` (default 60s).

## Concurrent HTTP attempts

Terminal updates require `status = processing`. If another worker finished first, updates return `skipped` — no second `succeeded` transition.

## Simulating subscriber failures (dev only)

Set `CONSUMER_ENABLE_SIMULATE=1` and send:

| Header | Behavior |
|--------|----------|
| `X-HookLab-Simulate: 500` | HTTP 500 (retryable) |
| `X-HookLab-Simulate: 429` | HTTP 429 + `Retry-After: 30` |
| `X-HookLab-Simulate: 400` | HTTP 400 (not retryable) |
| `X-HookLab-Simulate: slow` | Sleep 12s (timeout test) |

HookLab does not add this header; configure a test endpoint or proxy for manual runs.

## Replay after dead-letter

`POST /api/v1/deliveries/:id/replay` sets `pending` + outbox — attempt history preserved; `attemptCount` is not reset.

## What to test manually

1. Register endpoint → consumer with simulate `500` → observe `retrying` and attempts.
2. Exhaust retries → `dead_lettered` → replay → success with consumer fixed.
3. Publish with same `Idempotency-Key` twice → identical response.
4. Stop worker mid-request (slow simulate), wait for lease → recovery re-enqueues.
