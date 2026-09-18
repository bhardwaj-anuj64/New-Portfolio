# Launch Checklist

Every mock, placeholder, fabricated-content, and unset-secret item in this codebase, tracked in one place. Check items off as they get real content/config. Add new entries here whenever new placeholder work is introduced — don't let this list go stale.

Revisit this in full during the "content filling" pass, before going live.

## Secrets & config (currently empty placeholders)

- [x] `backend/Gateway/appsettings.json` → `Jwt:Key` — set via `JWT_KEY` in the homelab server's `.env` (`~/app/.env` on `portfolio-docker`). `appsettings.json` itself still carries the placeholder text for local dev; set via `dotnet user-secrets` there if needed.
- [x] `Smtp:User` / `Smtp:AppPassword` — set via a Gmail app password in the server's `.env`. Contact form now sends real email instead of logging to console.
- [x] `WebPush:VapidPublicKey` / `VapidPrivateKey` — generated and set in the server's `.env`.
- [ ] `Deploy:NotifySecret` — `DEPLOY_NOTIFY_SECRET` repo secret is set on GitHub Actions (New-Portfolio), but the matching value still needs adding to the server's `.env` by hand (same pattern as the other secrets above) before deploy-failure push notifications (`NotifyController` → `POST /api/notify/deploy-failure`) will actually authenticate. Until then the deploy workflow's notify step just logs a workflow warning and does nothing.

## Placeholder links (all currently `href="#"`)

- [x] `Hero.tsx` — GitHub + Instagram (no X/Bluesky/Discord accounts exist, icons dropped).
- [x] `ContactSection.tsx` — GitHub, LinkedIn + Instagram (no X/Bluesky/Discord accounts exist, icons dropped).
- [x] `ProjectShowcase.tsx` — no repo/demo links; all 3 professional projects are enterprise work that can't be shared publicly. `repoUrl`/`demoUrl` made optional on `ShowcaseProject` and `TiltProjectCard` now hides the row entirely when both are absent.
- [x] `MakerProjects.tsx` — Home Infrastructure & IoT Automation Hub → this repo (github.com/bhardwaj-anuj64/New-Portfolio, now public); Practical CAD & Technical 3D Printing Pipeline → github.com/bhardwaj-anuj64/portfolio-microservices (split out of this repo with `git filter-repo`, full history preserved, now public); Real-Time ESP32 Split-Flap Display has no repo (no code lives here), left without a link.
- [x] `Hero.tsx` (`ProfileRing`) — real headshot in at `frontend/public/profile.webp`.
- [x] `Hero.tsx` — real resume in at `frontend/public/resume.pdf`.

## Fabricated content — needs a real pass, not just links

Everything below reads as specific, plausible professional content, but it was written as placeholder sample copy, not sourced from you. This is the biggest launch risk in the list — it's the difference between "unstyled" and "actively making claims that aren't true":

- [x] `QualificationsSection.tsx` — real entries now: B.Tech CS (RIMT University, 2020), M.S. CS (University of Florida, 2023), Azure Fundamentals AZ-900 (Microsoft, 2023).
- [x] `ProjectShowcase.tsx` — real professional highlights: Common SharePoint File Upload Service, Enterprise Common Library & App Support, CI/CD Pipeline Automation & Copilot Workflows. Repo/demo links still `#` (tracked above).
- [x] `MakerProjects.tsx` — real tinkering projects: Home Infrastructure & IoT Automation Hub, Real-Time ESP32 Split-Flap Display, Practical CAD & Technical 3D Printing Pipeline. Repo/demo links still `#` (tracked above).
- [x] `AboutBio.tsx` — bio and "Recent Engineering Focus" now reflect real background; "Based in Austin, TX" confirmed accurate.
- [x] `RoleBadge.tsx` — confirmed real: "Application Development Analyst", "Full-Stack Engineer", "Hardware & Systems Tinkerer".
- [x] `ProfessionalSkills.tsx` / `TinkeringSkills.tsx` — skill chip blurbs rewritten off real project content (no fabricated metrics); TMC2209/resin-printing/TrueNAS-cluster claims removed, replaced with the actual UGREEN NASync setup.

## Mock backend data (presented as live, isn't)

- [x] `SystemController.cs` → `GetTelemetry()` — `cpuUsagePercent` is now sampled from the Gateway process's real `TotalProcessorTime` delta (was `Random.Shared.NextDouble()`); `activeServices` now counts real running containers via the new `IDockerService` (was hardcoded `4`).
- [x] `SystemsLab.tsx` — the "Why & How I Built It" copy claiming **"the numbers above are real, not mocked"** is now true for all three stats; the copy's fabricated "3-node Proxmox cluster + TrueNAS + k3s" description was also corrected to the actual single-VM setup.
- [x] `SystemsLab.tsx` / `AdminPortalModal.tsx` — the hardcoded `NODES`/`CONTAINERS` arrays are replaced by a new `GET /api/system/containers` endpoint (`IDockerService` reading the Docker Engine API over `/var/run/docker.sock`, mounted read-only into the `gateway` container in both compose files). `AdminPortalModal`'s separate fictional "Server Nodes" panel (there's only one VM, not a cluster) was dropped rather than wired to fake data.

## Microservice Playground — real backbone

`portfolio-microservices/tools-service/` (now its own repo: [bhardwaj-anuj64/portfolio-microservices](https://github.com/bhardwaj-anuj64/portfolio-microservices), split out of this one with `git filter-repo`, full history preserved) is a single FastAPI/OpenCV container hosting three logically distinct backends — Segmentation & Outline, Tonal-Banding/Depth, and Mesh Generator — consolidated into one container because the homelab VM (2 vCPU / 3GB RAM, already running the Gateway, frontend, and cloudflared) doesn't have the headroom for three separate Python runtimes that won't scale independently. Full architecture writeup, endpoint reference, frontend flow design, and known bugs/learnings live in that repo's `knowledge/`.

- [x] Containerized (`Dockerfile`), built/pushed by that repo's own CI (`.github/workflows/publish.yml`) to `ghcr.io/bhardwaj-anuj64/portfolio-microservices/tools`, pulled into this repo's `docker-compose.yml`/`docker-compose.prod.yml` as an internal-only `tools` service (versioned independently via `TOOLS_IMAGE_TAG`, decoupled from this repo's `sha_tag`), and reachable from the Gateway via `ToolsProxyController` (`/api/tools/**`).
- [x] **Tool Tracer** — real, gridfinity-organizer path only (`frontend/src/components/tools/tooltracer/`). Full flow: 4-corner calibration → magic-wand segmentation with a live mask preview → island review → per-tool pocket depth → mesh preview (watertight-checked) → STL/DXF export. Replaces the old `DxfTool.tsx` ("DXF Contour Tracer") in the Microservice Playground. "Individual holder" and G-code output types are shown disabled/"coming soon" in the UI rather than silently missing — neither is designed yet (see that repo's `knowledge/05-open-items.md`).
- [ ] **Keychain Holder** — end-to-end working (`frontend/src/components/tools/keychain/`, still named `KeychainGenerator.tsx`/`KeychainGenerator()` internally), but not print-accurate yet. A wall-mounted plaque, not a personal keychain tag: grabcut segmentation (bbox + fg/bg scribbles, live preview) → tonal-band relief (live preview) → assembly (thin raised picture-frame rim, adjustable rim/bar height, on/off light-box, hanger bar with adjustable pilot-hole count/diameter) → watertight-checked mesh preview → STL/DXF export. Backed by `build_holder_mask_and_depth` in `mesh_builder.py` and `POST /mesh/from_silhouette`. Verified live end-to-end against a local dev stack 2026-09-16 (full request chain returns 200, watertight mesh) — but real issues flagged from that test, still open:
  - Real-world sizing is off — `TARGET_SIZE_MM`/`px_per_mm` scaling needs a pass against actual print output, not just internal mm-consistency.
  - The mounting holes are plain cylinders — no thread geometry, so they only work as self-tap pilot holes for a soft-metal screw, not for a real machine-thread insert.
  - The hanger bar and holes are visually hard to distinguish from the frame in the mesh preview — needs a clearer preview render (separate shading/color per part, or a labeled view), not just the raw STL.
  - The exported mesh reads as blocky/pixel-art rather than smooth — `max_mesh_dim` (250 preview / 400 export) is too low-resolution for a subject with real detail; needs a higher grid resolution or an anti-aliasing/smoothing pass on the silhouette before extrusion.
  - Deliberately still deferred past v1 (separate from the above bugs): how the assembled plaque itself mounts to the wall (screws, adhesive strip, French cleat — left to the builder), a second hole shape (slot vs. round), and text/lithography engraving. The DXF export is the subject's own outline only, not the full rim+bar+holes shape (that geometry is built server-side on a raster mask, not as vector contours).
- [x] `Mesh3DTool.tsx` ("3D Mesh Generator") — retired. It was a random-heightmap mock (`JobQueueService.cs`) standing in for a demo of shared backend infra, not a tool of its own; now that Tool Tracer and Keychain Generator are both real, the tab, the mock job-queue/SignalR pipeline behind it (`JobController`, `JobQueueService`, `JobHub`, `signalr.ts`), and the `@microsoft/signalr` dependency were all removed.

## Site analytics

- [x] `AnalyticsController.cs` / `AnalyticsService.cs` — real page-view counter, resume-download counter, and a capped (50-entry) client-error log, persisted to `data/site-stats.json` in the same volume as push subscriptions. Wired into the admin dashboard (`AdminPortalModal.tsx` → `SiteAnalytics`). No third-party analytics service used — in line with the homelab/self-hosted approach.

## Deploy pipeline

- [x] `.github/workflows/deploy.yml` → `deploy:` job — was disabled/commented out pending the homelab server. Now live: a self-hosted GitHub Actions runner on `portfolio-docker` (behind NAT, no port forwarding) pulls sha-tagged images and redeploys via Docker Compose on every push to `main`. Public traffic reaches it through a Cloudflare Tunnel (`anujb.dev` → frontend, `/api/*` → gateway).
- [x] Post-deploy health check — the `deploy` job now curls `http://localhost:5000/api/system/health` (gateway) and `http://localhost:8080/` (frontend) after `up -d`, retrying for up to 30s, and fails the run if either never comes up healthy.
- [x] The `deploy` job now checks out the repo (`actions/checkout@v7`) and runs `docker compose -f "$GITHUB_WORKSPACE/docker-compose.prod.yml"` directly against that freshly-checked-out file, instead of a hand-maintained static copy on the server. Any compose change merged to `main` now takes effect on the very next deploy — no more manual scp to the server. `.env` (secrets, not in git) is still managed by hand on the runner host; that's a deliberate exception, not a gap.

## Site metadata (missing, not just placeholder)

- [ ] `frontend/index.html` — no `<meta name="description">`, no Open Graph / Twitter Card tags. Link previews (Slack, X, iMessage, etc.) will look bare when this URL gets shared.
- [ ] No `robots.txt` or `sitemap.xml` in `frontend/public/`.
