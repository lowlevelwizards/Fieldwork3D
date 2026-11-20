# P6.F — Verified tactical rendering cost baseline (2026-11-20)

## Provenance and measurement limits
Evidence is from successful E6.8, E6.15 and E6.17 browser workflows on P6.D PR #1866, including E6.8 [run 44742321385](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44742321385) and E6.17 [run 44742321357](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44742321357). Fresh Chromium ANGLE SwiftShader, mobile-emulated 390 × 844, seeds 23 and 97. E6.17 runs 90 actual live 60Hz simulation callbacks per seed/briefing condition. All observed timings below are CPU/driver wall time; none is hardware GPU time, actual iOS/Safari speed or a game FPS result. Separate baseline/candidate runs must use matched seeds, features, UI state, hardware and browser.

## First-frame shader preparation — E6.8

| Seed | GPU prewarm | compileAsync wall | First 3D frame wall | First-frame program info log CPU | GL programs before/after first draw |
|---|---|---:|---:|---:|---:|
| 23 | enabled | 180.9 ms | 785.3 ms | 138.8 ms | 54 / 56 |
| 23 | disabled | n/a | 1429.3 ms | 1064.9 ms | 0 / 48 |
| 97 | enabled | 173.2 ms | 837.2 ms | 153.0 ms | 58 / 60 |
| 97 | disabled | n/a | 1822.1 ms | 1296.0 ms | 0 / 53 |

On these four independent cold runs, the already-default prewarm materially reduces first-frame blocking on SwiftShader. This is not a statistically controlled physical GPU experiment. The enabled run still spends 785–837 ms in the first draw, and `getExtension` CPU wall is a notable remaining measured component (about 512–540 ms on enabled runs); never infer this is GPU execution.

## Live scene submission — E6.17

| Seed | Briefing idle mode | Main draws p95 | Unique materials p95 | Opaque draws p95 | Transparent draws p95 | Main non-shadow submit p95 | Worst non-shadow submit |
|---|---|---:|---:|---:|---:|---:|---:|
| 23 | 0 | 947 | 368 | 595 | 340 | 31.8 ms | 289.4 ms |
| 23 | 1 | 947 | 368 | 595 | 340 | 21.7 ms | 395.1 ms |
| 97 | 0 | 1317 | 495 | 898 | 416 | 27.5 ms | 428.0 ms |
| 97 | 1 | 1317 | 495 | 898 | 416 | 27.8 ms | 456.7 ms |

E6.17's previous-callback attribution proves large live RAF gaps often have large **preceding CPU/driver scene submission** work: 23/0 worst 433 ms gap with 263 ms preceding scene sync (252 ms GPU-submit *CPU wall*), while 97/0 worst 550 ms gap with 442.5 ms preceding scene sync. Simulation continues to execute fixed 60Hz ticks; do not reduce simulation cadence to address these renderer-origin hitches.

Across 90 frames at seed 23, main-pass owner submissions were approximately **475 operator draws/frame** and **454 environment draws/frame**. Frequent render sources include `operator-legacy-plus-X/BoxGeometry/MeshToonMaterial/opaque` (168/frame), `environment/wall-weathering/BufferGeometry/MeshBasicMaterial/transparent` (68/frame), `environment/known-exterior-detail/BoxGeometry/MeshStandardMaterial/transparent` (~57/frame). At seed 97 more operators and generated geometry are active, with 1317 main draws and 495 unique materials at p95. These are counted draw submissions, not distinct runtime meshes or a proxy for real GPU milliseconds.

## Sequenced optimization decisions

1. **P6.F evidence automation (this branch):** after each four-run E6.17 capture, summarize exact main material and transparency draw role counts, owner mean draws/frame and non-shadow CPU submit wall time into a retained `p6-mainpass-budget.json`. Reject incomplete/mismatched samples; do not invent a pass/fail performance threshold. Source: `scripts/verification/performance-p6-mainpass-budget.mjs`.
2. **P6.G owner-scoped opaque draw consolidation:** first isolate `operator-legacy-plus-X` *unchanging body part geometry* within rigid anatomical parents, preserving individual animated joints, armor/gear toggles, materials, slot raycasts and attachment anchors. Existing `src/rendering/fieldwork-model-compiler.ts` / E6.21 proves some static batch policies. Implement an explicit opt-in pilot, count actual E6.17 owner draws, screenshots and operator poses before enabling globally.
3. **P6.H environment transparency:** audit wall-weathering and known-exterior-detail submission ownership under fog disclosure and Director cutaways. Never merge translucent geometry across independently revealed or faded regions. If safe, combine only under the same visibility/fade owner and unchanged material. Run E6.19 exhaustive transparent-role parity with seeds 23/97 and mobile screenshots.
4. **P6.I native/mobile sustained performance:** repeat matched live captures with 4 operators and civilian/door stress on physical iPhone Safari; 30-cycle Quick Play/loadout/Arsenal/replay resource soak. Capture GPU resource counts, DOM canvases, GL contexts, RAF p95/peaks and memory after GC. Do not convert SwiftShader CPU wall into iPhone FPS.

## Release gating
Keep independent experimental changes feature-flagged, default-off until operator/door/weapon geometry tests, fog/visual acceptance, replay parity, TypeScript/build and matching browser evidence show no regressions. Merge only once prior Pages build is published and verified. Preserve the ability to visually compare legacy and candidate without changed exposure, shadows, procedural appearances or mission/AI rules.
