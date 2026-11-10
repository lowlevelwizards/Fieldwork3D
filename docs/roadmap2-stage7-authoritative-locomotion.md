# Roadmap 2 Stage 7 — authoritative locomotion & obstruction recovery

Baseline: main after Stage 6, `987829ed6e5210591fc55de3323d30213b22df76`.

## Goal and ownership

The original Stage 7 goal is to decompose `approach()`, previously a
~520-line fixed-step motor in `breach-game.ts`, into explicit route-following,
doorway right-of-way, physical door contact, collision/squeeze response,
obstruction recovery, and verified climb/vault control. The 60 Hz
`stepSession()` and its final shared motion-frame arbitration remain
**the** authoritative clock and position arbiter. No renderer, pose or
animation code may choose a legal movement step.

Stage 1 frozen deterministic scenario hashes, Stage 2 physical integrity,
Stage 3 visibility/memory, Stages 4–6 replay/UI/site-builder constraints and
the Stage 5 performance evidence gates remain valid. There is **no**
automatic baseline refresh, order rewrites, AI teleport, new physics,
door swing tweak, FOW change, animation retime, or combat tuning.

## Extracted modules

| Module | Exact fixed-tick responsibility |
| --- | --- |
| `breach-actor-motor.ts` | Own ordered per-actor call sequence: active traversal, embedded-body recovery, pending takeoff, route preparation, stride sampling, passage, auto door action, collision/commit |
| `breach-motor-traversal.ts` | Existing climb/step/vault choice, known portal check, window interaction, reserved landing revalidation, timed progression and continuous retreat |
| `breach-motor-route.ts` | Goal-change invalidation, normal route acquisition, known cover shove approach, leaf pressure while route unavailable, escape step and exponential retry backoff |
| `breach-motor-passage.ts` | GO-time schedule/leases from existing session, traffic intent, follower and right-of-way arbitration, deadlock retreat and stalled feedback |
| `breach-motor-door.ts` | Lookahead/physical door selection, guard opening stance, held/locked/obstructed states, open timer and leaf-clearance waiting |
| `breach-motor-collision.ts` | Friendly soft pass-through, enemy physical blocking, hinge pressure, full-body sweep, genuine sideways squeeze, sidestep, normal-lane recovery, wall glide, furniture corner glide, detour, replan, final resolved movement and footstep sound |
| `breach-motor-clutter.ts` | Contact-verified furniture shove and its existing cover revision/audio/interaction side effects |
| `breach-motor-contract.ts` | Narrow typed port for game-owned notification, sound, event, route-cache and passage-schedule services; shared pure motor math |

This explicitly **reuses** `breach-navigation.ts`, `breach-passage.ts`,
`breach-door.ts`, `breach-movement-recovery.ts`, `breach-mantle.ts`,
`breach-movement-authority.ts`, and `breach-actor-motor-stride.ts`.
It does not duplicate their collision, pathfinding, right-of-way, timing
or final motion arbitration.

The `breach-game.ts` `approach()` wrapper is retained as a tiny stable
call site for AI/commands; `motorHooks` is the only runtime service port
and has **no** internal tick clock. The traversal path used by the final
motion-frame resolver uses `motorTraversalWorld()` from the same owner
as the actor's vault, preventing a second landing rule.

## Acceptance, verification and release gates

1. No change to player `PlanNode[]` under temporary collision, passage
   waiting, shove, squeeze or route retry. World-truth repair only changes
   transient `nav` and never reveals unknown intel.
2. Door pressure and friendly passage keep active plan order, physical
   leaf blocking, passage lease fairness and nonoscillating head-on entry.
3. Full-radius sweep remains preferred. The real squeeze profile is only
   available near justified narrow geometry; static and furniture glides
   remain collision-checked. Embedded wall/door recovery never teleports.
4. Vault selection, window manipulation, reserved landing, collision
   interruption and continuous retreat retain exact prior behavior.
5. Stage 1 frozen fingerprints **must match** the pre-extraction engine;
   paired recordings, reload/wound, combat AI, civilians, completed orders,
   head-on passage and replay remain intact.
6. Run `node scripts/verification/breach-critical-suite.mjs`,
   `node scripts/verification/breach-stage7-motor-suite.mjs`,
   architecture boundaries, TypeScript and Vite production build, and
   fail-closed prior Pages build checkpoint.
7. Only merge after the previous release succeeded and was served. After
   merging verify Pages for the **new** main SHA and served build ID.
   Keep Stage 8 out of this PR.

## Manual playtest notes (not falsely claimed automated)

Use the same seed and FOW setting to compare four-person door queues,
tight interiors, wall-grazing, a blocked desk/chair pair, an accessible
window vault and a rejected landing. Watch for stuttering actors, phantom
squeeze, camera/pose snapping, order mutations, and replay divergence.
Node CPU wall-time and structural tests do not prove phone FPS or visual
approval.
