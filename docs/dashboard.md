# Dashboard (Milestone 9)

React + Vite + Tailwind UI in `apps/dashboard`. It is a **read-mostly operations console** over the existing REST API — no secrets are persisted server-side for the dashboard.

## Run

```powershell
npm run dev:api
npm run dev:dashboard
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` to the Fastify API.

## API key

1. `npm run db:seed` → copy `hl_live_…`
2. **Settings** → paste key → Save (stored in `localStorage` only)

## Pages

| Page | API used |
|------|-----------|
| Overview | `GET /health`, `GET /metrics`, recent `GET /deliveries` |
| Endpoints | CRUD ` /api/v1/endpoints` (signing secret shown once on create) |
| Events | `GET /events`, detail + filtered deliveries |
| Deliveries | list + detail, attempts, **Replay** on failed/dead-lettered |

## CORS

The API registers `@fastify/cors` for `DASHBOARD_CORS_ORIGIN` (default `http://127.0.0.1:5173`). Set `DASHBOARD_CORS=0` to disable.

## Security notes

- Endpoint signing secrets and org API keys are **not** returned on list/get endpoint APIs.
- The dashboard never logs keys to the server; replay and mutations use your browser-stored Bearer token.
