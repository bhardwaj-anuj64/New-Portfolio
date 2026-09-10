# Open Items — Deliberately Parked

These were discussed and explicitly deferred, not forgotten. Don't build
them without checking scope with the project owner first — each is a
meaningfully bigger or differently-shaped problem than it might look.

## G-code / CNC export (Tool Tracer)

Explicitly parked until the STL-producing Tool Tracer options (individual
holder, gridfinity organizer) are solid. This is NOT "one more export
format" alongside STL/DXF/OBJ — those are all geometry description,
whereas G-code is toolpath planning: stepover distance, cutter diameter
compensation (the tool has to stay inside the pocket boundary by its own
radius, not cut exactly on the line), feed rate, and depth-per-pass for
multi-pass pockets. It's well-understood classical CAM (e.g. basic zigzag
or contour-offset pocketing), not a research problem, but it's a distinct
category of work from mesh generation and deserves its own design/scoping
pass. Confirmed direction: the project owner wants this feature
eventually (for cutting foam/wood drawer inlays), just not now.

## Photogrammetry (potential future 5th tool)

Multi-photo → full 3D model reconstruction, explicitly scoped as
possible only AFTER the current three tools (Tool Tracer, Keychain, Mesh
Generator infrastructure) are complete — not before. Confirmed as
achievable with classical (non-ML) computer vision: Structure-from-Motion
(feature matching + camera pose recovery via bundle adjustment, classical
optimization, not learned) followed by Multi-View Stereo (point cloud
densification) and meshing (e.g. Poisson reconstruction) — this is how
tools like COLMAP/Meshroom work, predating deep-learning depth estimation.
Realistic scope note given directly to the project owner: this is weeks,
not days, even using existing algorithm implementations (e.g. OpenCV's SfM
module) rather than writing bundle adjustment from scratch. Do not start
this without an explicit go-ahead — it was deferred specifically so it
wouldn't distract from finishing the core three tools.

## Split-Flap ESP32 Telemetry (originally a 4th microservice idea)

Deprioritized to an end/optional item. The project owner has the physical
hardware and designed it themselves, but never scaled it to a full
display — and in the meantime found that someone else published a more
elegant design for the same concept. Not actively planned; mentioned here
only so it isn't accidentally revived as in-scope without checking. Also
worth noting if revived: this is a fundamentally different kind of
service than the other three — it needs to bridge real ESP32 hardware over
WebSocket, which is a different hosting/security conversation than a
stateless image-processing microservice (exposing anything that controls
physical hardware to the public internet is a meaningfully bigger risk
surface).

## Keychain feature pieces not yet implemented

Covered in more detail in `03-frontend-flows.md`, listed here for
visibility: border-style library (only a "fake grass" style has been
mentioned, not built), hook placement algorithm, light-box/tray geometry
assembly (combining outline extrusion + relief backing into one merged
printable piece — currently two separate geometry outputs).

## Tool Tracer "individual holder" geometry

Also covered in `03-frontend-flows.md`. Unlike the gridfinity organizer
(which cleanly reuses `build_pocket_depth_map`), a handle-slot-style
individual holder is a different geometry problem (an opening a tool is
pushed into, not just a surface recess) and hasn't been designed yet —
don't assume it's a trivial variant of the pocket organizer without
scoping it first.
