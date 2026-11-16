# E6.0–E6.1 — cold hostile presentation hitch reduction

**Baseline:** main at `5e05b06c5d02e3fda7494ca08cd780ae067aa2e0`
**Branch:** `refactor/e6ab-cold-contact-prewarm-20261116`
**Scope:** E6.0 first-use rig/appearance measurements; E6.1 distribute cold hidden hostile prewarm work. No motor, replay, visibility, fog, kit-content or quality-tier changes.

## Audit findings
The tactical scene already profiles rig construction, appearance, visual-kit/receiver-atlas material work, weapon builds and pose CPU separately through `?perf=1` / in-game PERF, alongside scene subphases and shadow/fog counters. Do not replace these diagnostic owners.

The existing P2.6 `shouldPrewarmContactRig` allows unseen, unbuilt hostiles to be prepared in non-started initial planning. The scene used to initialize and pose **every qualifying hidden hostile** in the first eligible 3D update, concentrating expensive wardrobe/rig/weapon/shader preparation in one RAF. Once prepared, the unchanged hidden actor skips pose on later frames; the first actual disclosure reuses the rig and produces an up-to-date pose. Historical replay explicitly excludes hidden-truth prewarm.

Historical P2.4 recorded one previous iPhone cold interval of 1,011ms, with ~619ms actor phase and ~456ms appearance work; subsequent optimizations may have changed that baseline. These figures are NOT the current results and do not establish the size of the expected E6 gain.

## E6.0 — existing profiler + controlled cold workload
`scripts/verification/e6-cold-contact-prewarm.mjs` constructs and evaluates actual `createOperatorRig` + `poseOperator` on four equivalent hidden hostiles. It compares old simultaneous all-at-once cold appearance/weapon work with one-hostile-per-render staged scheduling. Archive the per-frame CPU intervals, total CPU, complete weapon name/part snapshots, static appearance signatures and hidden root visibility in `artifacts/refactor-e6/cold-contact.json`.

The benchmark has no Three.js WebGL renderer or iOS device: its CPU timings are observational Node results, not browser RAF frame time, GPU time, real wardrobe shader compile or measured phone performance. Cold rig creation is run in both arms; time order, cache state, JIT, host contention and GC can affect values. It gates **only** full preparation count, per-frame quota, hidden state and appearance parity, never absolute timing or speedup percentage.

## E6.1 — exact bounded first-use work
- Keep `shouldPrewarmContactRig`'s strict phase, started, hostile, undisclosed, unbuilt and nonhistorical eligibility unchanged.
- In `TacticalScene3D.update()`, initialize a local `coldPrewarmBuilt` counter per render update; `withinContactPrewarmBudget` permits at most one eligible cold hostile on that callback.
- All hostile actor records remain in the authoritative session; no hidden actor becomes visible, rendered, targetable or known from prewarm.
- Prepared hidden rigs remain invisible; prewarm still runs full `poseOperator`/visual kit, material staging and weapons just as before. No reduction in asset detail, shadow atlas resolution or pose quality.
- Every subsequent planning render prepares one additional eligible hostile until all have rigs; each already prepared hidden actor skips redundant posing. Switching sites automatically re-evaluates eligibility against the new roster and scene rig ownership.
- If a player presses GO before prewarm completes, **an actor that actually becomes visible still initializes immediately**, rather than waiting for a speculative quota. This correctness-first fallback may cause a remaining cold contact hitch; do not claim it is eliminated.
- Historical replays, omniscient presentation, already visible actors, friendlies, and active simulation continue through their existing immediate/demand-driven paths.

## Acceptance and regressions
1. Pure budget and real cold rig tests: four planning frames prepare four hidden actors one at a time, zero extra after completion; no enemy revealed.
2. Real rig parity between old and staged cold build: same static appearance key, weapon part identity list and hidden state for equivalent inputs.
3. Existing P2.6 tests protect contact-prep material traversal, failure restoration, weapon reuse on first disclosure, and replay never prewarming undisclosed actors.
4. Scene source integration ensures budget is per `TacticalScene3D.update` invocation, not an accumulating or global token; no pause-time or actor movement authority added.
5. Execute curated architecture regression and exact stage production build, supported physical browser scene smoke where available. CPU baseline recorded in CI, not mislabelled as FPS.
6. First live encounter correctness and first-frame visual fidelity are hard requirements; the perceived hitch improvement should be checked later on the same device/seed with `?perf=1`, not inferred from Node measurements alone.

## Follow-ups and release protocol
E6.0/E6.1 are one compatible initial checkpoint. E6.2 dynamic pose input work and E6.3 fog upload work depend on *new* measured costs; do not automatically optimize either without verifying their hot path. Maintain current Pages release health, verify prior exact public build, run critical CI on final branch head, merge only when no deploy is active, then check public Pages serves the new SHA.
