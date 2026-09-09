# Launch Checklist

Every mock, placeholder, fabricated-content, and unset-secret item in this codebase, tracked in one place. Check items off as they get real content/config. Add new entries here whenever new placeholder work is introduced — don't let this list go stale.

Revisit this in full during the "content filling" pass, before going live.

## Secrets & config (currently empty placeholders)

- [ ] `backend/Gateway/appsettings.json` → `Jwt:Key` — placeholder text `REPLACE_WITH_A_LONG_RANDOM_SECRET_VIA_ENV_VAR_OR_USER_SECRETS`. Set via `dotnet user-secrets` locally, `JWT_KEY` env var in prod (already wired in `docker-compose.prod.yml`).
- [ ] `Smtp:User` / `Smtp:AppPassword` — empty. Needs a Gmail address + [app password](https://myaccount.google.com/apppasswords). Until set, contact form submissions only log to the console (`EmailService.cs`).
- [ ] `WebPush:VapidPublicKey` / `VapidPrivateKey` — empty. Generate via `WebPush.VapidHelper.GenerateVapidKeys()`. Until set, admin OTPs only log to the console (`WebPushService.cs`) — functionally fine, just not the "real" push-notification flow.
- [ ] `HomeAssistant:BaseUrl` / `LongLivedToken` — empty. Blocked on the homelab server actually existing (see memory: `mock_telemetry_temporary`). Not urgent — site works fine without it, the Home Assistant proxy just 502s until configured.

## Placeholder links (all currently `href="#"`)

- [ ] `Hero.tsx` — GitHub, X, Bluesky, Discord social icons.
- [ ] `ContactSection.tsx` — GitHub, LinkedIn, X, Bluesky, Discord social icons.
- [ ] `ProjectShowcase.tsx` — repo/demo links for all 3 professional projects.
- [ ] `MakerProjects.tsx` — repo/demo links for all 3 tinkering projects.
- [ ] `AdminPortalModal.tsx` (`AdminDashboard`) — "Home Assistant dashboard" link.
- [ ] `Hero.tsx` (`ProfileRing`) — no `public/profile.jpg` exists yet; falls back to "AB" initials. Drop a real headshot in.

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

All four of the above are blocked on the same thing: the homelab server not being set up yet (see memory `mock_telemetry_temporary`). Once that migration happens, this section either gets wired to real metrics or gets relabeled as illustrative.

## Site metadata (missing, not just placeholder)

- [ ] `frontend/index.html` — no `<meta name="description">`, no Open Graph / Twitter Card tags. Link previews (Slack, X, iMessage, etc.) will look bare when this URL gets shared.
- [ ] No `robots.txt` or `sitemap.xml` in `frontend/public/`.
