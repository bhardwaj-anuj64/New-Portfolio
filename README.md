# anujb.dev — Portfolio

A bespoke full-stack portfolio site for Anuj Bhardwaj. Not a template: a React + Three.js frontend backed by a real ASP.NET Core API, deployed to a self-hosted homelab server behind a Cloudflare Tunnel.

**Status: work in progress.** The site is live at [anujb.dev](https://anujb.dev), but a chunk of content and a few backend integrations are still placeholders — see [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for the exact list of what's real vs. mocked.

## Stack

**Frontend** (`frontend/`)
- React 19 + TypeScript, built with Vite
- Tailwind CSS v4
- `three.js` / `@react-three/fiber` / `@react-three/drei` for the WebGL section backgrounds
- Framer Motion for UI animation, Zustand for local state
- `@microsoft/signalr` client for the async job (microservice playground) hub

**Backend** (`backend/Gateway/`)
- ASP.NET Core 8 Web API — a single "Gateway" service, not a microservice mesh
- JWT bearer auth for admin-only endpoints
- SignalR hub for streaming async job results
- SMTP (Gmail) for the contact form, Web Push (VAPID) for admin OTP approval

**Infra**
- Docker Compose (local build vs. prebuilt GHCR images for prod)
- GitHub Actions: build/typecheck → push images to GHCR → deploy via a **self-hosted runner** on the homelab box
- Cloudflare Tunnel for public ingress — no inbound ports opened on the home network
- Runs on a Proxmox VM on a repurposed laptop, not a cloud host

## Project layout

```
frontend/
  src/
    components/      one folder per page section (hero, nav, contact, tinkering, ...)
                      + admin/ (OTP-gated dashboard) and tools/ (microservice playground)
    services/         api.ts (REST calls), signalr.ts, pushSubscription.ts
    store/             zustand stores (admin auth, labs modal)
    hooks/             small reusable hooks (canvas render loop, intersection, page visibility)
backend/Gateway/
  Controllers/        one controller per feature area (see API overview below)
  Services/           business logic behind each controller (analytics, email, push, job queue)
  Hubs/                JobHub.cs — SignalR hub for async job progress/results
  Models/              request/response DTOs
docker-compose.yml         local dev / builds images from source
docker-compose.prod.yml    production — pulls versioned images from GHCR
.github/workflows/deploy.yml
```

## Getting started (local dev)

Prerequisites: Node 22+, .NET 8 SDK.

```bash
# Backend — http://localhost:5000
cd backend/Gateway
dotnet run

# Frontend — http://localhost:5173, proxies /api and /hubs to the backend above
cd frontend
npm install
npm run dev
```

The dev server binds `0.0.0.0`, so it's reachable from another device on the LAN (useful for testing on a phone) — override the backend target with `BACKEND_URL=http://localhost:5080 npm run dev` if port 5000 is taken.

Copy `.env.example` to `.env` and fill in secrets before running the backend against real integrations (SMTP, Web Push, Home Assistant, Cloudflare Tunnel token). Locally, most of these can be left blank — the app degrades gracefully (contact form logs instead of sends, etc.) rather than crashing.

## Running with Docker

```bash
# Local build from source
docker compose up -d

# Production — pulls versioned images published by CI
docker compose -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` expects `GHCR_NAMESPACE` (owner/repo, lowercase) and the full secret set in `.env` — see `.env.example`.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`:

1. **build-and-test** — typechecks and builds the frontend, builds the Gateway (Release).
2. **publish** — builds and pushes `frontend` and `gateway` Docker images to GHCR, tagged `latest` and `sha-<short-sha>`.
3. **deploy** — runs on a **self-hosted GitHub Actions runner registered on the homelab VM itself**. The server sits behind NAT with no port forwarding, so it polls GitHub outbound rather than being reached by a cloud runner. It pulls the immutable `sha-*` image tag and runs `docker compose -f docker-compose.prod.yml up -d`.

Public traffic reaches the server entirely through a Cloudflare Tunnel (`anujb.dev` → frontend container, `anujb.dev/api/*` → gateway container) — no inbound firewall rules on the home network.

## API overview

All routes are under `/api`, prefixed by controller area:

| Area | Routes | Notes |
|---|---|---|
| `contact` | `POST /api/contact` | Public contact form → SMTP email |
| `analytics` | `POST /api/analytics/pageview`, `/resume-download`, `/error`, `GET /api/analytics/stats` | Beacon-style write endpoints are public; `stats` (read) requires a JWT. Page views are deduplicated to unique visitors via a client-persisted visitor id. |
| `admin/challenge` | `POST /generate`, `POST /verify`, `GET /vapid-public-key`, `POST /subscribe` | OTP challenge/response admin login, with optional Web Push approval on a second device |
| `admin/homeassistant` | `GET /{**path}` | Authenticated reverse proxy to a Home Assistant instance |
| `jobs` | `POST /api/jobs/stl`, `GET /api/jobs/stl/{jobId}` | Kicks off an async job; progress/results also stream over the `/hubs/jobs` SignalR hub |
| `system` | `GET /api/system/health`, `GET /api/system/telemetry` | Liveness + basic process metrics |

## Known gaps

This is a living project, not a finished showcase — the honest list of what's mocked, invented, or unwired (fabricated project copy, hardcoded infra status, a random-heightmap stand-in for real image processing, etc.) lives in [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) and is kept in sync with the code as things get resolved.
