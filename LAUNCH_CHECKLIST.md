# Launch Checklist

Every mock, placeholder, fabricated-content, and unset-secret item in this codebase, tracked in one place. Check items off as they get real content/config. Add new entries here whenever new placeholder work is introduced — don't let this list go stale.

Revisit this in full during the "content filling" pass, before going live.

## Secrets & config (currently empty placeholders)

- [x] `backend/Gateway/appsettings.json` → `Jwt:Key` — set via `JWT_KEY` in the homelab server's `.env` (`~/app/.env` on `portfolio-docker`). `appsettings.json` itself still carries the placeholder text for local dev; set via `dotnet user-secrets` there if needed.
- [x] `Smtp:User` / `Smtp:AppPassword` — set via a Gmail app password in the server's `.env`. Contact form now sends real email instead of logging to console.
- [x] `WebPush:VapidPublicKey` / `VapidPrivateKey` — generated and set in the server's `.env`.
- [ ] `HomeAssistant:BaseUrl` / `LongLivedToken` — empty. The homelab server now exists (`portfolio-docker` VM on Proxmox), so this is no longer blocked on infrastructure — just needs an actual Home Assistant instance set up and a long-lived token issued. Not urgent — site works fine without it, the Home Assistant proxy just 502s until configured.

## Placeholder links (all currently `href="#"`)

- [ ] `Hero.tsx` — GitHub, X, Bluesky, Discord social icons.
- [ ] `ContactSection.tsx` — GitHub, LinkedIn, X, Bluesky, Discord social icons.
- [ ] `ProjectShowcase.tsx` — repo/demo links for all 3 professional projects.
- [ ] `MakerProjects.tsx` — repo/demo links for all 3 tinkering projects.
- [ ] `AdminPortalModal.tsx` (`AdminDashboard`) — "Home Assistant dashboard" link.
- [x] `Hero.tsx` (`ProfileRing`) — real headshot in at `frontend/public/profile.webp`.
- [x] `Hero.tsx` — real resume in at `frontend/public/resume.pdf`.

## Fabricated content — needs a real pass, not just links

Everything below reads as specific, plausible professional content, but it was written as placeholder sample copy, not sourced from you. This is the biggest launch risk in the list — it's the difference between "unstyled" and "actively making claims that aren't true":

- [ ] `QualificationsSection.tsx` — all 4 timeline entries (B.S. Computer Science / UT Austin, Azure Fundamentals, Azure Developer Associate, Certified Kubernetes Administrator) are invented, not your real degree/certs.
- [ ] `ProjectShowcase.tsx` — all 3 "Professional System Architecture" projects (Claims Processing Platform, Inventory Sync Service, Internal Deploy Console) are invented.
- [ ] `MakerProjects.tsx` — all 3 tinkering projects (ESP32 Filament Dryer Controller, Home Assistant Relay Board, CoreXY 3D Printer Build) are invented.
- [ ] `AboutBio.tsx` — bio paragraphs and "Recent Engineering Focus" text are invented.
- [ ] `RoleBadge.tsx` — rotating titles ("Application Development Analyst", "Full-Stack Engineer", "Hardware & Systems Tinkerer") — confirm these are your real titles, or replace.
- [ ] `ProfessionalSkills.tsx` / `TinkeringSkills.tsx` — the "Impact & Achievement" / "Build Notes" expandable blurbs under each skill chip are invented anecdotes.

## Mock backend data (presented as live, isn't)

- [ ] `SystemController.cs` → `GetTelemetry()` — `cpuUsagePercent` is `Random.Shared.NextDouble()`, `activeServices` is hardcoded `4`. Only `memoryUsageMb` is real (actual gateway process memory).
- [ ] `SystemsLab.tsx` — the "Why & How I Built It" expandable copy claims **"the numbers above are real, not mocked"** — this is currently false for 2 of the 3 stats. Either fix the backend to return real numbers, or fix the copy.
- [ ] `SystemsLab.tsx` / `AdminPortalModal.tsx` — the `NODES` arrays (`proxmox-01`, `nas-truenas`, `k3s-worker-2`) are 100% hardcoded, not wired to any backend at all. Same for `AdminDashboard`'s `CONTAINERS` array (`portfolio-api`, `postgres`, `traefik`, ...).
- [ ] `JobQueueService.cs` → the "3D Mesh Generator" tool in the Microservice Playground **ignores the image you upload** and generates a random procedural heightmap instead. The UI looks fully functional; the backend doesn't actually process depth maps yet.

The homelab server (`portfolio-docker` VM on Proxmox) now exists and is live at `anujb.dev`, so these four are no longer blocked on infrastructure — the remaining work is wiring the code itself to real Docker/Proxmox metrics, or relabeling this section as illustrative.

## Microservice Playground — real backbone

`portfolio-microservices/tools-service/` is a single FastAPI/OpenCV container hosting three logically distinct backends — Segmentation & Outline, Tonal-Banding/Depth, and Mesh Generator — consolidated into one container because the homelab VM (2 vCPU / 3GB RAM, already running the Gateway, frontend, and cloudflared) doesn't have the headroom for three separate Python runtimes that won't scale independently. Full architecture writeup, endpoint reference, frontend flow design, and known bugs/learnings live in `portfolio-microservices/knowledge/`.

- [x] Containerized (`Dockerfile`), wired into `docker-compose.yml`/`docker-compose.prod.yml` as an internal-only `tools` service, built/pushed in CI (`.github/workflows/deploy.yml`), and reachable from the Gateway via `ToolsProxyController` (`/api/tools/**`).
- [x] **Tool Tracer** — real, gridfinity-organizer path only (`frontend/src/components/tools/tooltracer/`). Full flow: 4-corner calibration → magic-wand segmentation with a live mask preview → island review → per-tool pocket depth → mesh preview (watertight-checked) → STL/DXF export. Replaces the old `DxfTool.tsx` ("DXF Contour Tracer") in the Microservice Playground. "Individual holder" and G-code output types are shown disabled/"coming soon" in the UI rather than silently missing — neither is designed yet (`portfolio-microservices/knowledge/05-open-items.md`).
- [x] **Keychain Generator** — real, v1 scope (`frontend/src/components/tools/keychain/`). Full flow: grabcut segmentation (bbox + fg/bg scribbles, live preview) → tonal-band relief (live preview) → assembly (fixed-width border, on/off light-box, on/off keyring hole) → watertight-checked mesh preview → STL/DXF export. Backed by a new `build_masked_heightfield_solid` in `mesh_builder.py` (follows an arbitrary silhouette/hole boundary instead of always extruding a rectangle) and `POST /mesh/from_silhouette`. Border-style library, real hook-placement algorithm, and light-box/tray geometry beyond a flat on/off toggle remain deliberately out of scope — not decided against, just deferred past v1.
- [ ] `Mesh3DTool.tsx` ("3D Mesh Generator") is still the random-heightmap mock in `JobQueueService.cs` noted above — untouched by both the Tool Tracer and Keychain work. Per the settled design, Mesh Generator is shared backend infra, not its own demo; now that both real demos exist, retiring this tab (or replacing it with something else) is a decision to make explicitly, not defer further.

## Site analytics

- [x] `AnalyticsController.cs` / `AnalyticsService.cs` — real page-view counter, resume-download counter, and a capped (50-entry) client-error log, persisted to `data/site-stats.json` in the same volume as push subscriptions. Wired into the admin dashboard (`AdminPortalModal.tsx` → `SiteAnalytics`). No third-party analytics service used — in line with the homelab/self-hosted approach.

## Deploy pipeline

- [x] `.github/workflows/deploy.yml` → `deploy:` job — was disabled/commented out pending the homelab server. Now live: a self-hosted GitHub Actions runner on `portfolio-docker` (behind NAT, no port forwarding) pulls sha-tagged images and redeploys via Docker Compose on every push to `main`. Public traffic reaches it through a Cloudflare Tunnel (`anujb.dev` → frontend, `/api/*` → gateway).
- [ ] No post-deploy health check — the `deploy` job restarts containers but doesn't verify they came up healthy afterward. Add a curl/health-endpoint check as a follow-up step.
- [ ] The `deploy` job never checks out the repo — it runs `docker compose pull && up -d` against a **static copy** of `docker-compose.prod.yml` that lives on the server at `~/app/docker-compose.prod.yml` and is manually maintained. Any future change to that file in git needs a manual sync to the server (discovered when the `tools` service didn't appear after its first deploy). Worth fixing properly — e.g. have the `deploy` job check out the repo and scp/rsync the compose file (and relevant `.env` keys) on every run — before this bites again.

## Site metadata (missing, not just placeholder)

- [ ] `frontend/index.html` — no `<meta name="description">`, no Open Graph / Twitter Card tags. Link previews (Slack, X, iMessage, etc.) will look bare when this URL gets shared.
- [ ] No `robots.txt` or `sitemap.xml` in `frontend/public/`.
