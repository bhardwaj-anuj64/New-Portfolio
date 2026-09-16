# Launch Checklist

Every mock, placeholder, fabricated-content, and unset-secret item in this codebase, tracked in one place. Check items off as they get real content/config. Add new entries here whenever new placeholder work is introduced — don't let this list go stale.

Revisit this in full during the "content filling" pass, before going live.

## Secrets & config (currently empty placeholders)

- [x] `backend/Gateway/appsettings.json` → `Jwt:Key` — set via `JWT_KEY` in the homelab server's `.env` (`~/app/.env` on `portfolio-docker`). `appsettings.json` itself still carries the placeholder text for local dev; set via `dotnet user-secrets` there if needed.
- [x] `Smtp:User` / `Smtp:AppPassword` — set via a Gmail app password in the server's `.env`. Contact form now sends real email instead of logging to console.
- [x] `WebPush:VapidPublicKey` / `VapidPrivateKey` — generated and set in the server's `.env`.

## Placeholder links (all currently `href="#"`)

- [ ] `Hero.tsx` — GitHub, X, Bluesky, Discord social icons.
- [ ] `ContactSection.tsx` — GitHub, LinkedIn, X, Bluesky, Discord social icons.
- [ ] `ProjectShowcase.tsx` — repo/demo links for all 3 professional projects.
- [ ] `MakerProjects.tsx` — repo/demo links for all 3 tinkering projects.
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

- [x] `SystemController.cs` → `GetTelemetry()` — `cpuUsagePercent` is now sampled from the Gateway process's real `TotalProcessorTime` delta (was `Random.Shared.NextDouble()`); `activeServices` now counts real running containers via the new `IDockerService` (was hardcoded `4`).
- [x] `SystemsLab.tsx` — the "Why & How I Built It" copy claiming **"the numbers above are real, not mocked"** is now true for all three stats; the copy's fabricated "3-node Proxmox cluster + TrueNAS + k3s" description was also corrected to the actual single-VM setup.
- [x] `SystemsLab.tsx` / `AdminPortalModal.tsx` — the hardcoded `NODES`/`CONTAINERS` arrays are replaced by a new `GET /api/system/containers` endpoint (`IDockerService` reading the Docker Engine API over `/var/run/docker.sock`, mounted read-only into the `gateway` container in both compose files). `AdminPortalModal`'s separate fictional "Server Nodes" panel (there's only one VM, not a cluster) was dropped rather than wired to fake data.

## Microservice Playground — real backbone

`portfolio-microservices/tools-service/` is a single FastAPI/OpenCV container hosting three logically distinct backends — Segmentation & Outline, Tonal-Banding/Depth, and Mesh Generator — consolidated into one container because the homelab VM (2 vCPU / 3GB RAM, already running the Gateway, frontend, and cloudflared) doesn't have the headroom for three separate Python runtimes that won't scale independently. Full architecture writeup, endpoint reference, frontend flow design, and known bugs/learnings live in `portfolio-microservices/knowledge/`.

- [x] Containerized (`Dockerfile`), wired into `docker-compose.yml`/`docker-compose.prod.yml` as an internal-only `tools` service, built/pushed in CI (`.github/workflows/deploy.yml`), and reachable from the Gateway via `ToolsProxyController` (`/api/tools/**`).
- [x] **Tool Tracer** — real, gridfinity-organizer path only (`frontend/src/components/tools/tooltracer/`). Full flow: 4-corner calibration → magic-wand segmentation with a live mask preview → island review → per-tool pocket depth → mesh preview (watertight-checked) → STL/DXF export. Replaces the old `DxfTool.tsx` ("DXF Contour Tracer") in the Microservice Playground. "Individual holder" and G-code output types are shown disabled/"coming soon" in the UI rather than silently missing — neither is designed yet (`portfolio-microservices/knowledge/05-open-items.md`).
- [x] **Keychain Generator** — real, v1 scope (`frontend/src/components/tools/keychain/`). Full flow: grabcut segmentation (bbox + fg/bg scribbles, live preview) → tonal-band relief (live preview) → assembly (fixed-width border, on/off light-box, on/off keyring hole) → watertight-checked mesh preview → STL/DXF export. Backed by a new `build_masked_heightfield_solid` in `mesh_builder.py` (follows an arbitrary silhouette/hole boundary instead of always extruding a rectangle) and `POST /mesh/from_silhouette`. Border-style library, real hook-placement algorithm, and light-box/tray geometry beyond a flat on/off toggle remain deliberately out of scope — not decided against, just deferred past v1.
- [x] `Mesh3DTool.tsx` ("3D Mesh Generator") — retired. It was a random-heightmap mock (`JobQueueService.cs`) standing in for a demo of shared backend infra, not a tool of its own; now that Tool Tracer and Keychain Generator are both real, the tab, the mock job-queue/SignalR pipeline behind it (`JobController`, `JobQueueService`, `JobHub`, `signalr.ts`), and the `@microsoft/signalr` dependency were all removed.

## Site analytics

- [x] `AnalyticsController.cs` / `AnalyticsService.cs` — real page-view counter, resume-download counter, and a capped (50-entry) client-error log, persisted to `data/site-stats.json` in the same volume as push subscriptions. Wired into the admin dashboard (`AdminPortalModal.tsx` → `SiteAnalytics`). No third-party analytics service used — in line with the homelab/self-hosted approach.

## Deploy pipeline

- [x] `.github/workflows/deploy.yml` → `deploy:` job — was disabled/commented out pending the homelab server. Now live: a self-hosted GitHub Actions runner on `portfolio-docker` (behind NAT, no port forwarding) pulls sha-tagged images and redeploys via Docker Compose on every push to `main`. Public traffic reaches it through a Cloudflare Tunnel (`anujb.dev` → frontend, `/api/*` → gateway).
- [x] Post-deploy health check — the `deploy` job now curls `http://localhost:5000/api/system/health` (gateway) and `http://localhost:8080/` (frontend) after `up -d`, retrying for up to 30s, and fails the run if either never comes up healthy.
- [ ] The `deploy` job never checks out the repo — it runs `docker compose pull && up -d` against a **static copy** of `docker-compose.prod.yml` that lives on the server at `~/app/docker-compose.prod.yml` and is manually maintained. Any future change to that file in git needs a manual sync to the server (discovered when the `tools` service didn't appear after its first deploy). Worth fixing properly — e.g. have the `deploy` job check out the repo and scp/rsync the compose file (and relevant `.env` keys) on every run — before this bites again.

## Site metadata (missing, not just placeholder)

- [ ] `frontend/index.html` — no `<meta name="description">`, no Open Graph / Twitter Card tags. Link previews (Slack, X, iMessage, etc.) will look bare when this URL gets shared.
- [ ] No `robots.txt` or `sitemap.xml` in `frontend/public/`.
