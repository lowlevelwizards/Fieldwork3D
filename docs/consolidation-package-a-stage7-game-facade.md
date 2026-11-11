# Consolidation Package A — A7: game-domain and facade consolidation

**Baseline:** main `a7a2fbb42ee8116e69cd4caee015bd1fade4adfb` (A6 deployed). **Status:** A7-A audit and acceptance freeze. **Release:** one compatible A7 batch, not one deploy per extraction.

## Audited ownership

- `src/breach-game.ts` (2,218 source lines at baseline) contains: `TeamActor`/`Session` contracts (lines 134–283); per-session route/schedule caches (285–307); actor defaults and `newSession` (321–550); deployment and tactical authoring commands (552–1668); awareness, mission and contact rules (1682–2052); simulation port and public tick (`stepSession`, 2055–2085); debrief, visibility and query helpers (2086–2218).
- `breach-simulation-phases.ts` already owns the ordered tick. `breach-runtime-loop.ts` owns 60 Hz scheduling and post-tick recorder capture. `breach-plan-authoring.ts` owns atomic edit and history primitives. `breach-order-executor.ts`, `breach-simulation-actor-phase.ts`, `breach-simulation-motion-phase.ts`, `breach-firing-pipeline.ts`, and `breach-enemy-decision-controller.ts` are authoritative and **must not be cloned**.
- `breach-world-context.ts` already registers geometry per Session; compatibility process globals and presentation owner are intentionally retained for A8.
- `breach-replay.ts` consumes historical Session snapshots, and campaign, Labs, replay and tests import public game exports. Preserve the `breach-game.ts` API while relocating implementations.

## A7 work packages / exit gates

1. **A7-A (this commit):** record explicit dependency and state-ownership map; freeze invariants and batch release protocol. No code changes.
2. **A7-B:** extract fresh actor defaults and cohesive session construction without moving the first observation or changing random draw order. Keep state mutation and presentation handoff in the original order. Compare seeded and training sessions.
3. **A7-C:** consolidate tactical authoring implementation behind the existing public API and `breach-plan-authoring.ts` atomic-edit contract. Preserve touch/stroke, LOOK/WATCH, group stack, flash, synchronization, and undo/redo semantics. Avoid a new controller tier.
4. **A7-D:** move cohesive mission and read-only gameplay query implementations to narrow domain owners, preserving the existing ordered phase director and event processing. Where movement has hidden internal dependencies, retain it rather than exporting unsafe wrappers.
5. **A7-E:** clean facade imports and dependency boundaries; run critical checks and browser acceptance. Merge once, subject to release protection.

## Frozen behavior and high-risk boundaries

- **Session creation:** identical actor IDs, per-actor defaults, spawn positions, encounter/equipment random consumption, armed/civilian population, mission type, initial awareness and scene/intel binding. The legacy unseeded training case must remain.
- **Plan editing:** commands are only valid when planning permits; public command signatures unchanged; authoring transactions and undo/redo remain atomic; active WATCH and target cancellation retain A4 behavior. A motor route is never an authored route.
- **Tick:** `stepSession` is sole public evolution entry, and no UI/replay code ticks the phase director. Fixed 60 Hz budget, phase ordering, actor motion-origin timing and recorder capture remain unchanged. The phase sequence is doors, aging-effects, visual-awareness, belief-aging, actor-loop, civilian-motion, contacts, reports, observe-intel, fire, mission, execution-events.
- **Knowledge:** physical world truth never becomes revealed player/observer intel. Same fog/disclosure and historical replay facts; no playback-derived simulation mutation.
- **State:** actor and session structs are historical contracts, not dead fields. Per-session WeakMaps and revision-based cache invalidation remain unless parity evidence proves an alternate implementation.
- **Dependencies:** type-only dependencies on `breach-game.ts` from extracted modules are acceptable; runtime imports creating a game↔module cycle are not. Prefer narrow functional modules over another service host.

## Critical verification

```sh
npm run check
node --experimental-strip-types --test tests/breach-closeout-stage1-plan-authoring.test.mjs tests/breach-closeout-stage2-simulation-phases.test.mjs tests/breach-roadmap2-deterministic.test.mjs tests/breach-roadmap2-stage8-orders.test.mjs tests/breach-mission-controller-step8.test.mjs
node scripts/verification/breach-critical-suite.mjs
node scripts/verification/breach-architecture-boundaries.mjs
npm run build
```

Only expand tests for a specific changed contract. Existing A6/A5 real-WebGL PR browser acceptance must execute, not be skipped. Physical Safari/iPhone and physical desktop GPU validation remain separate manual follow-ups.

**Release protection:** commit each completed A7 substage to this feature branch; do not merge while a previous Pages deployment is pending. Confirm the previous main Pages release is successful and the live stamp matches; verify all critical PR checks and the new Pages release after a single safe batch merge. Failure blocks another release, not continued branch work.
