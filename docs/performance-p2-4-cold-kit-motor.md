# P2.4 — Cold wardrobe ray bakes and authoritative motor subphases

## Evidence: post-P2.3 iPhone report

- In an initial frame: RAF 1011ms, preceding JS 978ms, scene actors
  619ms: rig construction 118ms/4 and pose 486ms/4, including **appearance
  456ms**. Weapon construction was 8ms, residual IK+ was 21ms. This does
  **not** imply a 512px real-time shadow-map bottleneck: costume gear lighting
  uses independently baked per-vertex contact shadows.
- The current COPY report's live 142ms interval contained 55ms previous
  simulation, including an identified **43ms operator-moss/motor** subphase.
- Idle 215ms and 209ms intervals had 187ms and 153ms unattributed
  between-callback waits. These are not measured GPU times.
- The recent 120 frames showed low JS time (roughly 9–12ms P50),
  but that steady-state reading cannot describe first-use outfit work.

## Optimizations

1. Preserve identical shadow/contact rules and exact pixel bytes.
   The legacy ray-box slab method iterated axes dynamically for every
   per-vertex ray/caster pair. P2.4 uses fixed XYZ tests with the same
   near/far operation order, parallel-ray rules, and hit thresholds.
2. Garment receivers with zero *eligible* caster boxes still restore their
   exact 8-bit brightness baselines, clear both mask arrays, and update the
   attribute, but avoid normals, transformed vertex positions, and ray
   loops entirely. A change from a heavily equipped costume to an empty
   one is handled, not skipped.
3. Keep all 512px real-time shadow maps, existing atlas resolutions,
   garment geometry and textures, B presentation-sight policy, animation,
   and materials intact.

## Diagnostic follow-ups (opt-in ?perf=1 only)

- `3D actors ... app N ... kit X / atlas Y` distinguishes the wardrobe
  visual-kit update (including geometry refitting/baked equipment lighting)
  from separately cached head/collar receiver atlases. Reported values are
  CPU wall times, not GPU executions or predicted speedups.
- Within `SIM operator-id` separate `motor-route`,
  `motor-traversal`, `motor-stride`, `motor-passage`,
  `motor-door`, and `motor-collision`.
- The full parent motor duration and parent operator duration remain
  available; nested subphases are deliberately **not additive**. When
  selecting a hot simulation owner the report chooses parent phases, so
  an overlapping child label cannot supersede its operator.
- No new state machines, path authority, collision shortcuts, teleport,
  door rules, simulation tick rate, replay changes, or input throttle.

## Acceptance and future optimization

Critical tests must show that optimized slab intersection exactly
matches the original for negative and parallel rays, 450 sample origins,
three caster boxes and multiple reach values. Empty-caster mask and
baseline parity must pass. Fixed-tick simulation outcome comparisons
must be identical with and without probes.

Run a same-seed phone mission, capture the first frame and follow up
during actual movement through doors. If kit bakes still dominate,
measure the gear refine/vertex-lighting allocations before altering
visual quality. If motor-route dominates, target path search/retries;
if motor-collision dominates, target recovery and doorway checks
without weakening physical clearance.

Do not assume a reduced worst RAF gap across different maps is a
verified performance improvement.
