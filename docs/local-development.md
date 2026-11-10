# Local development

## Environment variables

See `.env.example` for the full list. Required for the API (Milestone 3+):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ENDPOINT_SECRET_ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM |
| `HOOKLAB_API_KEY` | From `npm run db:seed` (Bearer token) |

## Docker services

```powershell
docker compose up -d postgres
```

Redis is included for Milestone 6; safe to start now:

```powershell
docker compose up -d
```

## Database workflow

```powershell
npm run db:migrate
npm run db:seed
```

Load `.env` in your shell before `npm run dev:api`, or use a dotenv helper. The API reads `process.env` directly.

## Ports

| Service | Port |
|---------|------|
| HookLab API | 3000 |
| Webhook consumer | 4000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## Common issues

| Symptom | Likely cause |
|---------|----------------|
| `ENDPOINT_SECRET_ENCRYPTION_KEY is required` | Missing env when starting API |
| `401 unauthorized` | Missing/wrong `Authorization: Bearer` header |
| Health returns `503` / `database: false` | Postgres not running or wrong `DATABASE_URL` |
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` on `npm install` | Corporate TLS — set `NODE_EXTRA_CA_CERTS` |

## Integration tests

```powershell
docker compose up -d postgres
npm run db:migrate
$env:RUN_INTEGRATION_TESTS = "1"
$env:DATABASE_URL = "postgresql://hooklab:hooklab@127.0.0.1:5432/hooklab?schema=public"
$env:ENDPOINT_SECRET_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
npm run test:integration
```
