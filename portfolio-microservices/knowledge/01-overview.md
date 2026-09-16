# Portfolio Microservices — Architecture Overview

This covers three backend microservices and two frontend demos, all meant
to be showcased on a self-hosted portfolio website (home server, Proxmox +
Docker, Cloudflare tunnel, CI/CD via GitHub Actions). This document set is
the handoff context for continuing implementation — it captures not just
what was built, but *why*, and the real bugs found and fixed along the way
so they don't get silently reintroduced.

## The shape of it

**3 backend services:**

1. **Segmentation & Outline Service** — photo → clean 2D outline(s), with
   holes preserved where real (screw holes, wrench eyelets) and filled
   where they're segmentation noise (an eye on a pet photo).
2. **Tonal-Banding / Depth Service** — photo → adaptive posterized depth
   map (a stylized alternative to standard fine-grain lithophane generators
   — band count, band boundaries, and depth curve are all user-adjustable,
   not fixed).
3. **Mesh Generator Service** — the shared "2D/depth data → actual 3D
   solid" builder. Takes EITHER a continuous depth map (from
   Tonal-Banding) OR discrete per-tool pocket depths (from Segmentation)
   and produces a verified-watertight STL. Same code path serves both demos
   below — this is a deliberate architecture choice: a depth map is a depth
   map, regardless of whether it's continuous tonal bands or a binary
   pocket mask.

**2 frontend demos** (both consume all 3 backend services in different
combinations):

- **Keychain Holder** — photo → outline (Segmentation) + banded relief
  backing (Tonal-Banding) → assembled piece with border/hooks/light-box
  options → 3D preview (Mesh Generator) → export.
- **Tool Tracer** — photo of tools on paper → outline extraction
  (Segmentation) → user picks an output type (individual holder,
  gridfinity-style organizer, or G-code cutout) → 3D preview (Mesh
  Generator, for the STL-producing options) → export.

There is **no standalone "Lithophane" or "Mesh Generator" demo** — the
lithophane/relief effect is a Keychain feature, and Mesh Generator is
shared infrastructure, not a demo in its own right. This was explicitly
reconsidered mid-design (see `03-frontend-flows.md` for the reasoning) —
don't reintroduce a third demo without checking with the project owner.

## Why this split

The 3-service split isn't arbitrary — each service is genuinely reused:

- Segmentation is used by BOTH demos (outline for Keychain, outline for
  Tool Tracer).
- Tonal-Banding is used by Keychain only, but was built standalone because
  it's a big enough concern (adaptive k-means banding, depth-curve control)
  to deserve isolation, and was explicitly designed for potential reuse.
- Mesh Generator is used by BOTH demos' final preview/export step, and
  deliberately generalized (see `02-services.md`) so the SAME heightfield
  solid-builder serves lithophane relief AND tool-holder pockets.

## Read next

- `02-services.md` — each service's endpoints, request/response shapes,
  and implementation notes
- `03-frontend-flows.md` — step-by-step what each demo actually does,
  service call sequence
- `04-testing-learnings.md` — real bugs found and fixed during development,
  with the reasoning, so they aren't silently reintroduced
- `05-open-items.md` — deliberately deferred/parked features and why
