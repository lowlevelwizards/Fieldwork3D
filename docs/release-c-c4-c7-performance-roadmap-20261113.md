# Release C-R2: C4–C7 interactive environments, performance-first

Start main: `c9eecb89e28a28739fce6e41d328c27021106a8a`. Release only after main/Pages compatibility preflight.
All work is feature-branch staged, with CI after logical groups. No new physical
bodies, per-frame surfaces, persistent scene objects, or independent physics.

## Audited systems & stage acceptance
- **C4 exterior semantics**: `exterior-sites.ts` already enforces functional
  zones and service/arrival lanes; `public-street-layout.ts` is semantic but
  currently recomputed repeatedly from every candidate. Compute the actual
  frontage once per generation, reuse the same street geometry in frontage
  location and placement rejection, and preserve corridor/door access. The
  map surface registry remains visual-only: never add invisible collisions.
- **C5 interaction authority and targeting**: `planNearbyInteraction` sorts
  all physical props and windows even for one command, and the push executor
  resolves stable string IDs by whole-array search on every 60Hz tick. Replace
  with one-pass deterministic nearest picks and cache the committed prop ID
  for the lifetime of the **single active order**, validating identity on
  each tick, not rebuilding map-sized registries. Keep legacy index orders
  and authored WATCH/LOOK ownership. Treat push-target taps as pointing at
  known, reachable physical objects, without global fog disclosure.
- **C6 physical reactions**: `relocateCover` sweeps legitimate cover
  continuously but repeats a full wall/door/cover enumeration for every
  sample. Use a conservative swept broadphase per explicit displacement,
  then retain identical narrowphase collision, body overlap, and hinge
  authority. Replace auto-shove's full-cover map/sort with bounded contact
  candidates only. Preserve per-commit object revisions, sound, replay,
  debris and session-owned geometry.
- **C7 physical traversal**: reuse existing motor, window/mantle and landing
  reservations. Avoid `filter/flatMap` allocations for active traversal
  occupancy and eliminate needless probe work only when ruled out by exact
  prerequisites; never skip step collision, permit an invalid landing, add
  new tick work, or force squeeze/vault instead of a legal ordinary walk.

## Performance gate
- No additional 60Hz actor/world/visibility scans, no added full-site
  generation attempts, no new render bodies, no timers or presentation-only
  colliders.
- Characteristic work must be **the same or lower** at equal input; verify
  deterministic swept collision parity against old algorithm, seeded
  exterior site quality and nav, contact/proximity selection stability,
  shared replay state, and fixed-tick motor acceptance.
- CI Node measurements are not smartphone thermal or framerate claims.
- Use targeted regression suite plus build and a bounded before/after C0
  corpus; integrate prior main deployments rather than piling merges.
- Keep C8+ NPC mission agency and broader destruction outside this release.
