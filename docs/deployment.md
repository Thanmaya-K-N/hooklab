# Deployment (Milestone 10)

## Docker Compose (full stack)

Infrastructure only (default):

```powershell
docker compose up -d
```

Add HookLab processes (API, dispatcher, worker):

```powershell
$env:ENDPOINT_SECRET_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
docker compose -f docker-compose.yml -f docker-compose.app.yml up --build
```

Run migrations once:

```powershell
docker compose -f docker-compose.yml -f docker-compose.app.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.yml -f docker-compose.app.yml run --rm api npx prisma db seed
```

The API listens on **port 3000**. Consumer and dashboard still run on the host for local webhook testing unless you deploy them separately.

## Environment highlights

| Variable | Production |
|----------|------------|
| `WEBHOOK_ALLOW_LOCALHOST` | `0` (default in Docker image) |
| `ENDPOINT_SECRET_ENCRYPTION_KEY` | 64 hex chars, secret manager |
| `API_RATE_LIMIT_MAX` | tune per tenant (default 120/min) |
| `RATE_LIMIT_ENABLED` | `1` (set `0` only in tests) |

## SSRF

See [security.md](security.md). Endpoint URLs are validated at registration and re-checked at delivery time against resolved IPs.

## Health

`GET /api/v1/health` — Postgres + Redis checks (rate limit allow-listed).
