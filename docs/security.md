# Security

## Webhook HMAC (Milestone 5)

HookLab signs each outbound webhook using the **endpoint signing secret** (shown once when you create an endpoint).

### Signature algorithm

```
HMAC-SHA256(endpointSecret, timestamp + "." + rawBody)
```

- `timestamp` — Unix seconds from `X-HookLab-Timestamp`
- `rawBody` — exact UTF-8 bytes of the HTTP body
- Header — `X-HookLab-Signature: v1=<hex>`

Sign the bytes you send; re-serialized JSON can change field order and break verification.

### Subscriber checklist

1. Read raw body before JSON parse.
2. Validate timestamp skew (`WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS`).
3. Constant-time HMAC compare.
4. Then process the event.

## SSRF protection (Milestone 10)

Webhook URLs are attacker-controlled destinations. HookLab applies **two layers**:

| Layer | When | What |
|-------|------|------|
| **Static** | `POST/PATCH /endpoints` | Scheme http/https only, no embedded credentials, block localhost/private literals and known metadata hostnames |
| **Resolve-time** | Before each outbound `fetch` | DNS lookup; reject if any A/AAAA is private, loopback, link-local, or metadata |

Additional delivery rules (already in place):

- `redirect: "manual"` — do not follow redirects to new hosts
- `ssrf_blocked` errors are **not** retried

### Local development

Set `WEBHOOK_ALLOW_LOCALHOST=1` in `.env` so `http://127.0.0.1:4000/webhooks` is allowed. **Default is off** in the production Docker image.

## API hardening

- **Bearer API keys** — SHA-256 hash at rest (Milestone 3)
- **Rate limiting** — `@fastify/rate-limit` on the API (`API_RATE_LIMIT_MAX`, default 120 req / minute); `/api/v1/health` excluded
- **Request IDs** — `x-request-id` / Fastify `requestId` in logs
- **Body limit** — 1 MiB on API and consumer
- **Endpoint secrets** — AES-256-GCM at rest; never returned on list/get
- **Dashboard** — API key only in browser `localStorage`

## Not covered in v1

- Full DNS rebinding lab (short TTL re-resolve on redirect) — mitigate with resolve-at-delivery + no redirects
- Per-organization rate limit tiers
- mTLS to subscribers
