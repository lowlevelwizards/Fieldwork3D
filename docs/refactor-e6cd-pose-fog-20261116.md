# E6.2–E6.3 — dynamic pose preparation and fog submission pipeline

**Baseline:** `be810d360d3638cd9e25e8339139ce468daeea8a` (E6.0–E6.1 deployed).
**Branch:** `refactor/e6cd-pose-fog-pipeline-20261116`.

## Audited actual behavior

- `TacticalScene3D.update` applies one pose per visible actor, plus at most one newly prewarmed hidden hostile during initial planning. Previously prepared undisclosed hostiles skip further pose calls. Motion, feet, animations, muzzle and contact are all rendered from the authoritative snapshot or historical frame. **Do not throttle visible pose**: breathing, reload phases, aim and replay-seek frames are dynamic even while the motor is paused.
- The 30-slot production pose commit and per-rig scratch already have Package B8 allocation consolidation. `actorPhaseCosts.poseMs` captures evaluator time, but the actor phase also performs weapon clearance, proximity collection, interaction/visual setup, and beam/lightwork. A new `posePrepMs` splits this out under existing opt-in PERF.
- Fog already has a stable session fingerprint, a lower-frequency paint cadence (quality approximately 55ms; balanced/performance 100ms), a separate memory-layer fingerprint and one CanvasTexture instance across site swaps. A changed fingerprint rebuilds Canvas2D memory+sight and marks the texture dirty; a constant fingerprint does not. This **does not mean the texture is partly uploaded**: the CanvasTexture may be a full RGBA upload of up to 1280×1280 pixels, and WebGL work executes later at render, not within the Canvas2D paint sample. No second LOS/disclosure owner is appropriate.

## E6.2 — bounded dynamic pose prep

- In the live per-actor proximity loop, replace two `Math.hypot` calculations per eligible teammate with squared-radius comparisons at **unchanged 40u stack and 90u safety thresholds**.
- Keep distinct coordinate owners: stack occupancy samples fixed-step actor position; the safety list samples interpolated visual position. Preserve teammate side/health filtering and existing `safetyBodyFor`, friend-safety rule, weapon clearance/shoulder handling, rig pose and contact logic.
- Expose `posePrepMs` only when the existing PERF profiler is enabled. No extra normal-game timing marks, simulation ticks, caches, or visibility scheduling.
- This is a targeted hot-path arithmetic cleanup; there is **no new measured game-frame speedup claim**. Compare `posePrepMs`, `poseMs`, actor total and RAF P95 using the same representative seed/device.

## E6.3 — fog cache and upload attribution

- Replace per-call `filter().map()` roster/door arrays in `fogSessionFingerprint` with ordered direct iteration; replace per-actor/per-door array allocation in `fogFingerprint` with delimiter-equivalent concatenation. Retain rounding, mode, seed, seen revision, object revision, actor health, posture, position/heading and door fraction exactly.
- Keep existing 55/100ms presentation cadence, memory-vs-sight invalidation, site/session invalidation, historical/replay disclosure and 3D depth/material rules. No coarser fog resolution, deferred first frame, experimental partial texture updates, new graphics objects or gameplay visibility change.
- PERF now exposes `fogComposeMs` (the current changed-frame Canvas2D CPU composition only), `fogTextureUpdateRequests` (cumulative `needsUpdate` calls including site swaps), and `fogTextureBytesPerRequest` (RGBA dimensions × 4, a **size estimate**, not captured GPU transfer bytes/time). The counter indicates dirtied texture versions; multiple dirty writes before a renderer draw can coalesce and do not prove multiple GPU uploads.
- This does **not** reduce the number of already warranted full CanvasTexture updates. High actual upload costs must be confirmed with browser WebGL GPU timing or tracing before exploring dirty rectangle data textures or smaller resolution; this batch removes avoidable key allocations and improves attribution without a first-disclosure visual regression.

## Release gate

1. E6.2 distance equivalence tests over both radii; confirm no replacement of `withinContactPrewarmBudget` or early hidden skips.
2. E6.3 original array-fingerprint byte parity for many deterministic rosters/doors, session parity after actor motion, door, knowledge/mode changes, and undisclosed hostile exclusion.
3. E6.0–E6.1 cold-contact tests and current sight/mesh/physical fog tests; existing architecture critical suite; production typecheck/build.
4. Verify previous Pages deployment succeeded and that public Pages served exact expected main build. Merge the PR only after critical CI and release readiness checks on its final head, and only if no deployment is already queued. Verify post-merge Pages job and public SHA before calling it deployed.
5. Re-evaluate same-device `?perf=1` actor phase, `posePrepMs`/pose and fog frame counters before proposing E6.4. GitHub-hosted Node and static parity gates cannot establish iPhone FPS or GPU latency.
