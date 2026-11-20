# Fieldwork3D — Performance P6 comprehensive staged scope

**Baseline:** main `8e7e73c` (P4 merged and published; P3.A–B also published). P5 Workbench lifecycle is a separate open draft. This pass targets *actual* tactical execution CPU cost, startup and sustained resource pressure without removing visual effects or altering tactical rules.

## Non-negotiable invariants
- Identical fixed-step ticks, player order semantics, AI/perception, LOS and fog, injuries and shot results, random seeds, replay film, mission outcomes, full weapon/equipment appearance and interaction on phone/desktop.
- Retain source of truth for action/motor, world geometry, movement, audio, history; presentation optimizations cannot read hidden state to make information visible.
- Keep hardware/OS distinctions: Chromium SwiftShader timings are not iPhone Safari GPU measurements; RAF gap != GPU execution. Report preceding callback CPU slices and 3D submit wall separately.
- No concurrent production deploys. Feature branches, critical checks, batched release checkpoints, published SHA verification.

## Implementation roadmap and definition of done

| Stage | Priority | Scope | Safe implementation / gate | Status |
|---|---|---|---|---|
| **P6.A — combat presentation scans** | P0 tactical live | Operators re-scan the full recorded shot history every 3D frame to find a currently active muzzle flash. Cost scales with operators × retained events. | Reuse one `RecentMuzzleShotFrameIndex` on the 3D scene, populated from the *original* history; index only ages within the maximum current weapon lifetime, then invoke the unchanged per-weapon resolver and `shotVisibility` predicate. Test overlapping/hidden bursts, future/expired shots, arbitrary order and replay seek parity. | Implemented on P6 branch |
| **P6.B — actor/door lookups** | P0/P1 tactical live | Every operator does several `s.doors.find` and `s.operators.find` scans for planned actions, grips, targets and medical contacts. | Rebuild reusable first-match maps once per displayed scene from original session arrays, preserve `Array.find` duplicate-ID semantics; never mutate session or cache across replay frames. Test identity, missing/null targets and lookup source contracts. | Implemented on P6 branch |
| **P6.C — frame attribution** | P0 evidence | Need reproducible proof which prior callback drives 33/67/100ms live RAF gaps. Existing P1.7/E6 instrumentation is available. | Add targeted microbench and count budgets to compare stage A/B against previous direct scans; capture same-seed 4-man, crowded civilian and door crossing live frames in detailed PERF. Record number of shots visited, candidate flash events, actor/door lookups, prior JS/UI/scene and draw submission. No unearned FPS claims. | Next |
| **P6.D — cold Quick Play startup** | P0 first impression | Previous E6.8 observed long *software* first-render submissions; need isolate shader/program creation, scene assembly, texture uploads and cold operator creation. | Compare coldBench seeds 23 and 97 against compiled baseline, first 3D present, main pass, shadow map, renderer/program counts, map materials. Consolidate immutable geometry only if visual/parity checks pass. Avoid hiding game elements, skipping first image or prolonging interactions. | Follow-on release |
| **P6.E — long-session resources** | P1 stability | Repeated scene/Outfitter/Arsenal/Studio/replay open/close cycles might retain GL resources, old canvas nodes, texture caches or listeners. | 10/30-cycle resource soak with bounded geometry/textures/programs/contexts, no stale async readbacks. Preserve ownership; dispose only when no views lease resources. | Follow-on release |
| **P6.F — packaging & UX acceptance** | P1 | Verify loadout and Arsenal changes coexist with tactical improvements and P4/P5. | Typecheck, production bundle, muzzle event parity, shot/visibility/replay contracts, door/medical pose integration, fixed 60Hz deterministic physical tests, browser Quick Play and Campaign smoke; inspect live Pages build stamp after each safe batch. | Release gate |

## Current batch P6.A–B implementation details
- `breach-combat-cues.ts` provides a reusable map of time-eligible recent shot references in original history order. All original per-weapon flash durations, muzzle attachments, source shot objects and personal visibility predicates remain unchanged.
- `breach-3d.ts` refreshes that presentation index and reusable ID maps once before the actor loop. Door/actor lookups used for grips, kick contact, pickup/medical animation, targeting and planned door handling use the same current session objects as the original arrays.
- `breach-frame-lookup.ts` enforces first-match ID semantics on every update; no stale frame-derived state across mission/replay seeks.
- Expected algorithmic change: from O(visible actors × total recorded shots) to O(total shots + actors × very recent shots for the actor), and from O(actors × operators/doors) lookups to O(operators + doors + lookups). This is a source-level complexity statement, not a hardware FPS number.

## Verification and performance comparison protocol
1. **Pure parity:** deterministic seeded event histories, newest hidden shot, suppressed/hider, SMG/carbine/rifle/shotgun lifetime thresholds, negative/unsorted age, and reverse replay/nonmatching actor. Map records with duplicate IDs preserve `Array.find` first result; null medical contact stays absent.
2. **Critical gates:** exact-head `node --experimental-strip-types --test` P6 tests plus existing Phase A combat cues and tactical firefight B2, `npm run check`, `vite build`, existing fixed-step, physical recovery and weapon/door pose critical smoke.
3. **Performance evidence:** script-controlled history sizes 64/512/2048 and actors 4/16/88 for old vs indexed path, and actual 20–30s live on iPhone Safari and desktop with PERF enabled; separate active, planning, briefing, replay and suspended captures.
4. **Release:** do not merge while any Pages job is queued/running. Confirm current main build is public; merge compatible green P6.A–B at one checkpoint, verify new build ID and main SHA before resuming other release. If unrelated physical acceptance baseline fails on unchanged logic, document that separately, never relax threshold to force green.

## Out of scope for speculative optimization
No gameplay-order simplification; no reduced fog cones or enemy perception; no shadow/lighting/texture downgrades; no pruning replay shot records or changing ordering; no asynchronous mutation of simulation, pathing or world state; no changing actual gun models or equipment options.

## Remaining open evidence
- Prior iPhone P1.7 peaks 326/282/277/249/233ms demonstrate user-visible delays but not a unique CPU/GPU cause.
- E6.8 first renderer submit 3262.8/2826.7ms under Chromium ANGLE SwiftShader is a cold attribution reference, not physical Safari.
- Historical D3.18 physical-arrival threshold failure is a separate simulation issue on untouched code. Do not attribute it to P6 without a controlled exact-base comparison.
