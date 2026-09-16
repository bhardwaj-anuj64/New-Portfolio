# Frontend Demo Flows

Two demos. Each is a showcase piece for the portfolio — the point is to
demonstrate range (computer vision, procedural geometry, full-stack
service orchestration), so the UI should make the pipeline visible, not
hide it behind a single "upload and download" button.

## Naming history (context, not a decision to revisit)

The lithophane/mesh functionality went through several names during
design: "3D Mesh Generator" → "Lithophane Generator" → back to
"Mesh Generator." It was also considered as a possible third standalone
demo before being settled as a Keychain feature + shared backend service.
This is mentioned only so a future session doesn't rename things again
without reason — the current state (2 demos: Keychain, Tool Tracer; Mesh
Generator = shared backend, not a demo) is the settled decision.

---

## Demo 1: Keychain Holder

**Concept:** upload a photo (a pet, a face, a flat object) → get a
physical keychain combining outline-based shape with tonal-relief detail.

**Flow:**

1. **Upload photo.**
2. **Segmentation step** (Segmentation & Outline Service):
   - `grabcut` is the default method for typical subject photos (busier
     backgrounds); `magicwand` available for plain-background photos.
   - User can nudge with `fg_hints`/`bg_hints` scribbles if the auto-result
     misses something (e.g. a stray object near the subject getting
     swept into the mask — GrabCut only separates by color/bbox region,
     not semantics; a toy touching the subject's paw will merge in unless
     scribbled out).
   - Result: a clean outline/silhouette.
3. **Tonal banding step** (Tonal-Banding/Depth Service):
   - User adjusts band count (slider) and depth curve.
   - Live preview via `/band/preview`.
   - This becomes the light-box backing's relief pattern.
4. **Feature assembly** (frontend-side composition, not yet a backend
   endpoint):
   - Border style selection (e.g. a "fake grass" style among others).
   - Key hooks placed along the border; hook count is a parameter that
     scales with photo/border size; hook style options (J hooks, straight
     hooks).
   - Light box backing: on/off toggle. When on, uses the Tonal-Banding
     depth map for a banded (not fine-continuous) relief look, plus a
     slim backing for LEDs, plus an optional tray at the bottom (on/off).
5. **3D preview** (Mesh Generator Service, `/mesh/from_depth_map`):
   - Shows the assembled piece before export. Use a LOW `max_mesh_dim`
     here for responsiveness; only go high-res on the final export call.
6. **Export.** Formats: STL (given), DXF (outline/tracing only, no
   relief), OBJ, 3MF.

**Not yet implemented:** the actual border-style library, hook placement
algorithm (parametric position generation around a border, scaled to
size), and light-box/tray geometry assembly (combining the outline
extrusion with the Mesh-Generator-produced relief backing into one
combined printable piece — currently these are two separate geometry
outputs, not yet merged into one).

---

## Demo 2: Tool Tracer

**Concept:** photo of tools laid on a sheet of known-size paper → traced,
scaled outlines → a choice of physical outputs for tool organization.

**Flow:**

1. **Upload photo** (tools on paper, e.g. wrenches on US Letter/A4).
2. **Calibration** (Segmentation & Outline Service, `/calibrate/rectify`):
   - User clicks the 4 corners of the paper.
   - ALWAYS use the 4-corner rectify endpoint, not just a 2-point distance
     calibration — see `04-testing-learnings.md` for why (scale accuracy
     AND background-noise elimination both depend on it).
3. **Segmentation** (`magicwand` method):
   - User seeds background points — CRITICALLY, this must include seeding
     any shadowed gaps between tools, not just the brightly-lit paper.
     The UI should prompt for this explicitly (e.g. "click any shadowed
     areas between tools too") — see `04-testing-learnings.md`, this was
     initially mistaken for a fundamental "touching objects" limitation
     when it was actually just incomplete seeding.
4. **Island review** (`/segment/islands`):
   - Thumbnail grid, tap to include/exclude (filters out dust specks,
     shadow fragments, etc. that cleared the area filter but aren't a
     real tool).
5. **Output type selection** — user picks one:
   - **(a) Individual holder** — just a handle-shaped slot per tool.
   - **(b) Gridfinity-style organizer** — one rectangular block enclosing
     all selected tools' footprints, each recessed as its own pocket, with
     buffer/clearance spacing between pockets (reuse Segmentation's
     `pad_mm` for the buffer). Per-tool pocket depth is a USER INPUT per
     tool (explicit project decision — not auto-computed from anything;
     the UI needs a depth field per selected tool).
   - **(c) G-code/CNC export** — PARKED, see `05-open-items.md`. Do not
     build this until the STL-producing options (a) and (b) are solid.
6. **3D preview** (Mesh Generator Service, `/mesh/from_pockets` for
   options a/b): shows the resulting holder/organizer before export.
7. **Export.** DXF for outline/tracing only; STL for the holder/organizer
   solid; G-code parked (see open items).

**Not yet implemented:** the frontend flow for collecting per-tool pocket
depth (option b), the "individual holder" geometry specifically (a
handle-slot shape is a different geometry problem than a pocket — it's a
holder with a tool-shaped hole most tools would have to be pushed into,
not just a recess; this needs its own design pass, it does not currently
reuse `build_pocket_depth_map` in an obviously correct way and should be
scoped before implementation).
