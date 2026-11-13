# Release C-R3 — C8 through C11 completion scope (performance-first)

Baseline main: 5d24678d067f1357b691878e78faff4a77083646. One owner for physics, doors/windows, sensory observations, AI intent, mission truth, renderer, and replay. **No new per-frame environment objects, continuous prop physics, global AI search, or static noise/lighting simulation.**

## C8: NPC environmental agency
- Existing evidence-only enemy contact, urgent decisions, motor and shot legality are authoritative. Current controller constructs transient sorted visible lists, friendly-safety lists, and repeated enemy searches *during contacts*. Replace avoidable sorting / higher-order scans with single pass deterministic selection preserving ties, targeting and urgency.
- Preserve the two elective AI tasks/tick scheduler, urgent reaction delivery, heard-only suspicion, known-only investigation, local cover/door closure and caution limits. Bounded investigation probes must use physical architecture; no enemy omniscience.
- Critical tests: visual-target selection tie parity, AI scheduler fairness, no perceived unseen target, local door closure and rescue/capture response, contact performance.

## C9: Real mission-world integration
- Reuse the five actual operations: CLEAR, HOLD, INTEL/evidence, RESCUE/missing person, CAPTURE/warrant. No new spawned false evidence, hidden targets, duplicate civilians, or invented mission item colliders.
- Preserve exact preexisting generated actor placements and RNG lanes. In one-time encounter generation, compute invariant per-room defender value, door range and fixture activity *once*, rather than per group; preserve per-group occupancy bonuses, route acceptance, physical constraints and seed-stable tie order.
- Validate instantiated actors/civilians, objective site and tagged capture/rescue population offline in integrated seed/mission corpus. No new live contract checks.

## C10: Tactile, physical presentation
- Reuse actual cover/door/window state and render-owned geometry. One-time scene build: index object-wear marks by owner/index instead of repeatedly filtering all marks for every static wall and prop, reuse preallocated immutable color values for instanced debris rather than a new THREE.Color per instance.
- Preserve site visibility/fog and replay scenes, live cover revision updates, material lifetime and quality/appearance. No new materials/draw loops or physics bodies.

## C11: Final integration + release contract
- Tight regression tests on C8 AI behavior, C9 placement parity and mission evidence, C10 geometry/presentation, replay and fog. Exact 33-map C0 corpus compared against `5d24678d067f1357b691878e78faff4a77083646`, no additional invalid maps, blocked routes or mission population losses.
- Include broad changed-source CI, TypeScript/Vite build, browser Pages critical gate, verified previous deployment stamp and exact-head merge to main only after green. Real iPhone FPS, memory and thermal remain device validation rather than claims from Node timing.
- Freeze physical scope C4–C7; defer full destructible architecture, vehicles, systemic furniture destruction and new campaign objectives.
