# Consolidation E0 — integrated audit baseline and implementation plan

**Starting deployed main:** f2d91d2be2865d7e76cbc8208adc5b6d4586e609 (D3.18, November 15, 2026).
**Stage:** read-only source, verification, and behavior evidence. No gameplay, scene, asset, CSS, weapon, replay, save, or simulation changes.
**Branch:** refactor/e0-integrated-read-only-audit-20261115.

## Purpose and ownership

Package A0 already identifies reachable modules, dynamic uncertainty, cycles, test-only references and compatibility paths. C0 already identifies 19 presentation owners and five viewing contexts. Package B already consolidates the 30-slot operator pose output. D3.18 is the newly deployed motor/route baseline.

E0 must reuse A0's scanRepository() and C0's inspectC0() and verifyC0(), rather than creating new import graph, scene controller or motor. The new E0 runner adds source-located UI refresh signals, conditional-context CSS selector repeats, CI workflow exceptions and test overlaps, module hotpath candidates, protected authority contracts, and an evidence-backed priority list. Static candidates are NOT proof of dead code, performance regressions, GPU cost, or redundant authority.

Run:

    node --test tests/refactor-e0-audit.test.mjs
    node scripts/verification/refactor-e0-audit.mjs --check --out artifacts/refactor-e0

The runner emits baseline.json, ownership.json, hotspots.json, ui-css.json, verification.json, audit.json, and prioritized-backlog.md to CI artifacts, not ever-changing tracked snapshots. The existing architecture-refactor-critical.yml invokes it on refactor branches; no additional workflow is necessary.

## Source findings

Current main contains 1,088 TypeScript sources, 1,666 test files, 145 GitHub workflows, and 19 Vite HTML build entries. breach-game.ts has 96 import declarations, breach-3d.ts has 86 and breach-main.ts has 74. These counts are not architecture defects on their own.

- UI/CSS: breach-style.css has roughly 4,089 lines, 150 media-query blocks and 210 important declarations. Previous lexical scan found 321 repeated selector groups. Scope media conditions before treating repetitions as redundant; test portrait, landscape, replay and Studio.
- UI refresh: breach-main.ts::updateHud() synchronizes deployment, briefing, mission, replay library, quick state, tactical HUD and context. The runtime refreshes near 120ms during planning, 180ms while running, 750ms after completion; explicit user actions still refresh immediately. Profile actual changed DOM before suppressing updates.
- Rendering: TacticalScene3D update visits known rooms, intel surfaces, openings, details, walls, cutaway and doors. Material shader invalidation is already guarded by transparency transitions. The C1 scene lifetime, static batch and site-material owners must be retained.
- Route policy: a single physical motor remains authoritative; D3.18 transient route hints must never overwrite authored goals or bypass world-swept clearance. The forensic route observer remains disabled during ordinary play.
- Replay: MissionRecorder captures 60Hz evidence, around 20Hz full outcome frames and immutable historical knowledge; capped recordings mark incompleteness explicitly. Do not discard evidence to reduce memory.
- Visuals: resolveEffectiveHelmetAppearance(), weaponVisualLayout() and workbenchVisualAnchors() already exist. Audit their cross-view consumers before inventing a new visual model.
- World and campaign: the old A0 inventory identified an architectural/worldgen dependency cycle and a campaign-state/progression cycle. Re-evaluate live graphs and distinguish an actual harmful cycle from an intentional reference.
- CI: ci.yml still has branch-name-specific helmet exceptions and 16 selected plus broad shards. Duplicate test references across independent workflows are not proof of unnecessary CI; keep mandatory browser, physical and Pages verification.

## D3.18 physical acceptance evidence from green PR checks

Source: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43758824857 (tested head f05ed217ce953dd05455647e16180e723123e8b8).

| Offline real-motor corpus | Actual arrivals | Completed squads | Suspicious loops | Route searches | Aggregate route CPU |
| --- | ---: | ---: | ---: | ---: | ---: |
| Historical 11 sites | 80 | 18 | 0 | 2,562 | 9,095.91ms |
| Frozen tenth 22 sites | 140/176 | 29/44 | 0 | 28,918 | 137,538.08ms |
| Independent eleventh 22 sites | 146/176 | 29/44 | **1** | 27,275 | 81,663.58ms |

The eleventh cohort succeeded under its safety checks, which did NOT require zero suspected loops. Preserve that single suspected loop as a follow-up reproduction case. These are offline CPU work totals, not smartphone frame-time metrics or proof of E0 improvements.

## E0 full scope, ranked by audit impact and ease

| Package | Scope and artifact | Impact | Ease | Next implementation gate |
| --- | --- | ---: | ---: | --- |
| E0.01 | Reuse A0/C0; pin head, counts, reachability and owners | 5 | 5 | No missing canonical owners or second source graph |
| E0.02 | Workflow trigger, shard, skip, duplicate reference and branch-exception inventory | 5 | 4 | Maintain or increase affected-domain tests |
| E0.03 | Same-context CSS selector/declaration, media scope and important census | 4 | 5 | Computed-style plus visual screenshot parity |
| E0.04 | UI refresh, selection, DOM and listener lifecycle audit | 4 | 4 | Browser DOM-diff and input-latency comparison |
| E0.05 | Source graph, pure core, cycles and single authority contracts | 4 | 4 | 60Hz, Session geometry, motor, pose output unchanged |
| E0.06 | Route search, physical recovery sources and D3.18 independent loop | 5 | 3 | Frozen and new seeded arrival, loop and CPU parity |
| E0.07 | Scene visibility, invalidation, shadow and GPU resource lifetime | 5 | 3 | Camera/fog/replay/scene disposal acceptance |
| E0.08 | Operator, helmet, wardrobe and family weapon cross-view geometry | 4 | 3 | Matched silhouette and material references |
| E0.09 | 60Hz record journal, outcome frames, long-session heap and seek | 5 | 2 | Historical replay parity and on-device soak |
| E0.10 | Test-only, type-only, unreferenced and compatibility consumer census | 3 | 4 | Prove deep-link/Lab/test consumers before deletion |
| E0.11 | Worldgen, physical fixture semantics, campaign serialization and cycles | 3 | 3 | Seed, collision, mission, persistence invariants |
| E0.12 | Integrated risk, evidence, rollback and E1–E3 handoff | 5 | 3 | Exact-head release checks and served Pages stamp |

## Ranked E1–E3 candidate fixes — NOT part of E0 gameplay changes

1. E1.1: Remove proven obsolete branch-specific CI exceptions; preserve specialized tests and fail-closed regression routing.
2. E1.2: Remove genuinely duplicate same-context CSS only after computed-style and mobile/desktop screenshot acceptance.
3. E1.3: Reduce unnecessary derived UI state and DOM writes where measurable; retain immediate order/WATCH/mission transitions.
4. E2.1: Avoid measured repeated scene presentation work using existing invalidation revisions; never cache a live hinge or disclosure across an incorrect epoch.
5. E2.2: Reuse existing visual resolver/anchor policies across Operator Studio, Lab, Arsenal, tactical and replay; preserve family silhouettes.
6. E3.1: Cut proven redundant route searches and transient writers, not real physical sweeps or authored goal ownership.
7. E3.2: Reduce replay temporary allocations and memory retention without dropping history or leaking future knowledge.
8. E3.3: Migrate consumers before removing legacy adapters or breaking truly harmful dependency cycles.

## Required acceptance matrix

- Fixed-step phases, actual actor motor and orders: breach-critical-suite.mjs, D3.18 targeted tests and real frozen/independent motor scenarios.
- Doors and crossings: audit-passage-q5.mjs historical and release-A mirrored 168 fixtures; exact body and hinge clearance.
- Fog and renderer: 2D/3D common knowledge masks, scene restart, replay seek, Studio/Lab isolation and real WebGL browser flows.
- Operator weapons: headgear comparison in four views, firearm family/attachment anchors; real hardware screenshot review remains manual.
- Runtime: stable same-seed p50/p95 CPU slices, 33/67ms RAF hitches, replay recorder/heap/GC and WebGL draw/triangle counts; CI Node timings are not device FPS.
- Replay and saves: historical motion/shot/event/knowledge parity, explicit truncation, Quick Play, campaign, wardrobe and weapon preset schemas.
- Deployment: production typecheck, build stamp and CI acceptance; verify previous public Pages SHA before merging, then prove exact new served SHA. Never pile overlapping production deployments.

## Completion and release conditions

- E0 regression tests cover lexical same-conditional-context CSS, repeated workflow test references and branch exceptions, 12 priority areas, and real-source authority drift.
- Existing A0 and C0 checks are reused, not replaced. Reports clearly distinguish observed behavior from performance or deletion candidates.
- No src/ or production styling changes, no runtime clock, player order, geometry, save or visual changes.
- The final PR head has green required CI, typecheck and build; E0 artifact files are retained; prior Pages run is healthy.
- Only after merge and exact served build verification should the E0 deployment be marked complete.

E0 completes the architecture-audit foundation, NOT the subsequent E1–E3 production refactors.
