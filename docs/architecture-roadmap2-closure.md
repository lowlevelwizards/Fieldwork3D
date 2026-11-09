# Architecture Roadmap 2 — Completion Audit and Closure Contract

Status: **REOPENED — audit and acceptance planning only**.
Audit baseline: main `dd3cc258ae81414fac8ec610f7c895527e3e372a`, November 9, 2026.
Original merged implementation: PRs #1177, #1178, #1179.

## Important distinction

The 12 original roadmap topics received staged commits and tests, but
implementation sometimes narrowed the original *architectural objective*
to one isolated helper. Keep the successfully extracted helpers; do not
count a stage complete until its **original responsibility boundary** has
moved and is exercised through an end-to-end/authoritative regression.

**A passing TypeScript build or source-code placement assertion alone does not
demonstrate architectural completion.** Preserve 60 Hz order and seeded RNG,
combat outcomes, valid plans, fog disclosure, collision, actor pose, replay
historical evidence, and campaign persistence. Do not queue new production
releases until the prior GitHub Pages deployment has completed and serves
the expected commit.

| # | Original stage (Impact / Ease) | Delivered in Roadmap 2 | Closure status |
|---|---|---|---|
| 1 | Deterministic gameplay scenarios and regression harness (10/10, 4/5) | Three seeds, 90 ticks each, simple MOVE orders and repeatability | Partial |
| 2 | Generated map physical-integrity contracts (9/10, 4/5) | Bounded door sweep detection and mobility tests | Partial |
| 3 | Visibility, discovery and fog-of-war contracts (10/10, 3/5) | Shared friendly ground-sight eligibility; a few mode tests | Partial |
| 4 | Finish reducing `breach-main.ts` (8/10, 4/5) | Moved debrief panel DOM to `ui/breach-mission-debrief.ts` | Partial |
| 5 | Performance baselines and stronger release gates (9/10, 4/5) | Focused workflow (since superseded); existing host CPU performance workflow | Partial |
| 6 | Extract 3D site construction from scene controller (9/10, 3/5) | Micro-debris builder and surface-color policy | Partial |
| 7 | Extract authoritative locomotion and obstruction recovery (10/10, 2/5) | Incidental teammate door-pressure arbitration | Partial |
| 8 | Tactical order-execution state machine (9/10, 2/5) | WAIT/HOLD CLEAR order handler | Partial |
| 9 | Enemy perception and tactical decision pipeline (9/10, 3/5) | Acoustic evidence intake | Partial |
| 10 | Combat firing and damage-resolution pipeline (9/10, 2/5) | Bounded impact evidence retention | Partial |
| 11 | Operator rig and animation presentation pipeline (9/10, 2/5) | Pure locomotion pose-input calculation | Partial |
| 12 | Session-scoped geometry and simulation context (10/10, 1/5) | Safe synchronous temporary site audit scope | Partial |

These are *closure assessments against the original broad goals*, not a
claim that the extracted subcomponents are defective.

## Stage acceptance criteria

### 1 — Deterministic gameplay scenarios and regression harness
- [ ] Assert stable outcome fingerprints or independent expected outcomes;
      matching two runs of a potentially broken simulation is not enough.
- [ ] Exercise authored move/edit/undo, door entry and conflicting passage,
      combat (including reload/injury), AI contact, civilians and mission end.
- [ ] Include replay/restart and multi-seed/longer-run memory and ownership
      checks; no cross-test active-geometry state contamination.
- [ ] Keep the fast critical subset small and make full stress opt-in.

### 2 — Generated map physical-integrity contracts
- [ ] Check movement through actual generated thresholds, both hinge sides,
      full swing arcs, door-frame clearance and approach corridors.
- [ ] Validate movable furniture/adjacent fixtures and obstructed paths
      using authoritative motor/collision rules, not only approximate
      generation-time geometry.
- [ ] Add pathological seeded fixtures for stuck operators and door ping-pong;
      audit must not mutate active missions.

### 3 — Visibility, discovery and fog-of-war contracts
- [ ] Define and test clear observer sight vs team discovery vs briefing
      knowledge vs full-view override vs recorded replay disclosure.
- [ ] Exercise windows, opened/closed doors, interior/exterior façades,
      bodies, and LOS boundaries across 2D/3D presentations.
- [ ] Eliminate duplicate policy decisions; presentation must not use hidden
      actors or forgotten sightlines as snapping/visibility evidence.

### 4 — Finish reducing `breach-main.ts`
- [ ] Inventory remaining tactical picking/commit, HUD/replay HUD,
      menu/lifecycle and DOM orchestration after Roadmaps 1, 3 and 4.
- [ ] Move remaining cohesive responsibilities to their existing natural
      homes; the entrypoint wires controllers instead of owning policies.
- [ ] Audit all call sites for duplicate orchestration and cyclic imports.
      Verify interactions with real input/replay scenario tests.

### 5 — Performance baselines and stronger release gates
- [ ] Keep generic architecture critical CI and Pages served-build preflight;
      retire duplicated workflows rather than adding one per roadmap.
- [ ] Record comparative CPU/recorder/memory baselines for representative
      map sizes, contact intensity and extended rounds; report p50/p95.
- [ ] Explicitly separate host CI results from actual iPhone/GPU frame rates;
      only gate on actionable, repeatable regressions.

### 6 — Extract 3D site construction from the scene controller
- [ ] Finish modular scene construction for room floors, roofs, walls,
      fixtures/dressing and openings; exterior, micro-debris and openings
      builders already exist and should be reused.
- [ ] Scene controller owns composition, cache lifecycle and disposal—not
      the procedural geometry recipes or gameplay/collision authority.
- [ ] Verify map swaps, material lifetime, wall/cutaway/fog visibility,
      windows, and render parity across generated sites.

### 7 — Extract authoritative locomotion and obstruction recovery
- [ ] Transfer the remaining physical motor orchestration and collision
      sweeps out of `breach-game.ts` behind explicit session/world inputs.
- [ ] Consolidate squeeze, sidestep, obstacle/shin step-over, door pressure,
      blocked recovery, friendly right-of-way and transported-body coupling.
- [ ] Assert exact deterministic movement decisions, no permanent furniture
      or doorframe trapping, and no two-sided door-leaf ping-pong.

### 8 — Tactical order-execution state machine
- [ ] Extract the full `runOrders` dispatcher and action progression,
      including movement, door, stance, LOOK/WATCH, wait/sync, utility,
      casualty/interaction and abort/rejection flows.
- [ ] Keep immutable authoring separate from authoritative execution,
      and preserve progress, event ordering and the 60 Hz tick phase order.
- [ ] Test complete authored plans and door entry, not just isolated handlers.

### 9 — Enemy perception and tactical decision pipeline
- [ ] Extract the complete `enemyDecisions` orchestration, reusing sound
      and visual evidence and the existing AI policy modules.
- [ ] Make evidence intake, confidence, tactical intent, path selection,
      cover/retreat and communication explicit stages with typed contracts.
- [ ] Preserve deterministic RNG call order, performance and observed
      behavior, including hearing-without-seeing and losing contact.

### 10 — Combat firing and damage-resolution pipeline
- [ ] Separate shot readiness/ignition, ray and barrier resolution, armor/
      wound damage, civilian hits and replay/presentation evidence retention.
- [ ] Keep existing shot-ignition and impact-evidence modules as inputs;
      eliminate firing/damage orchestration from the simulation monolith.
- [ ] Verify seeded hit/occlusion/penetration outcomes, friendly safety,
      injury stages, cadence, reloads and historical ballistics without
      introducing a second RNG owner.

### 11 — Operator rig and animation presentation pipeline
- [ ] Decompose the large `poseOperator` procedure into coherent pose,
      contact, upper/lower-body, weapon, reload and IK phases.
- [ ] Preserve a single anatomical transform writer; no new simulation
      from render-only pose calculations.
- [ ] Validate live/replay/Studio/Operator Lab parity, stock alignment,
      short-stock transitions, crouching and movement under gear.

### 12 — Session-scoped geometry and simulation context
- [ ] Replace process-global `activeSite` geometry dependence in
      authoritative nav, LOS, AI, projectiles and motor calls with explicit
      `SessionWorldGeometry` or scoped world-query adapters.
- [ ] Give per-session queries and revision invalidation clear ownership
      while retaining compatibility adapters only at boundaries.
- [ ] Prove two distinct sessions can interleave without geometry leakage;
      procedural audits must not alter a live session's cover, routes or
      collision index, even after errors or nested scopes.
- [ ] Keep the current temporary scope as a short-lived compatibility
      utility until authoritative callers have migrated.

## Release strategy

1. **Foundation closure**: 1, 2, 3 and 5, then 4 as application ownership
   follows the tested contracts. Commit stages independently on one
   feature branch; merge once the complete compatible batch is proven.
2. **Runtime boundary closure**: 6, 7 and 8. Work one cohesive subsystem
   to completion; do not count a delegating wrapper as the full extraction.
3. **AI/combat/pose/world ownership closure**: 9, 10, 11 and 12. These are
   intertwined, high-risk changes and may need multiple verified release
   checkpoints rather than a single enormous merge.

Before moving to another stage, capture **before/after responsibility maps**,
remaining code in the old owner, dependencies and cyclic imports, scenario
golden outputs, tests run, performance delta, and explicit approval of the
acceptance checklist. Don't merge/deploy anything from this audit branch.

## Existing related work: reuse rather than duplicate

- Roadmap 3 added narrower modules for AI visual evidence, shot ignition,
  locomotion clearance, site exterior, world-context migration, etc.
- Roadmap 4 added authored-plan history/validation seams, a fixed-tick phase
  support module and actor/civilian visual lifetime reconciliation.
- These are useful **subcomponents**, not substitutes for finishing the
  Roadmap 2 system-level responsibilities.
