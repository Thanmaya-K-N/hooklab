# Idempotency

## Event publish (API)

Clients may send:

```http
Idempotency-Key: order_12345
```

On first request, HookLab creates the event, deliveries, outbox rows, and stores the `202` response body keyed by `(organizationId, idempotencyKey)`.

On duplicate requests with the same key (same organization), HookLab returns the **stored response** with `202` — no second event.

## Delivery processing (worker)

- Deliveries already `succeeded` are not sent again.
- `delivery_attempts` has a unique constraint on `(deliveryId, attemptNumber)` so duplicate jobs cannot record two successes for the same attempt number.

## Exactly-once

HookLab does **not** guarantee exactly-once delivery over the public internet. It guarantees **at-least-once** attempts with subscriber-side deduplication (event `id`).
