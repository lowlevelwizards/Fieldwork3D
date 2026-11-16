# Consolidation E5.0–E5.2 — replay retention and capture allocation

**Scope:** Observational memory baseline, lossless capture-side sharing, shared recording cap.
**Branch:** `refactor/e5-replay-capture-memory-20261116`
**Baseline:** The most recent Pages-verified `main` before this feature branch.

## Audited cause
E4 completed replay query and HUD hot-path optimization. The 20 Hz `MissionRecorder` outcome film retains complete random-access frames, with immutable structural sharing and every 40th frame a fully independent keyframe. The live session's doors, shots, casings, dropped magazines, impacts, grenades, flash bursts and civilian harm histories are still deep-cloned in `snapshot()` first, then compared and shared in `shareUnchangedReplayFrame()`. This incurs temporary per-frame allocations during otherwise unchanged moments, including long sessions.

The 12,000-frame limit also returned **after** writing to plan, ballistic and individually observed door journals. A full recording could therefore keep retaining auxiliary evidence even though its advertised film was capped at approximately ten minutes. Earlier window, motion, event, personal ground and outcome captures were already cut off.

## E5.0 — controlled evidence
`scripts/verification/refactor-e5-replay-memory.mjs` produces `artifacts/refactor-e5/memory.json` with paired deterministic scenarios:
- Baseline: clone first, share immutable matching values afterward.
- Optimized: compare live snapshot-shaped values to preceding immutable frame and skip unchanged clones before post-capture sharing.
- The same seeded building, fixed 20 Hz time progression, simulated effects and in-place door/shot/impact changes.
- Independent full keyframes every 40 samples, exact historical snapshot digest equality, identical retained effect-array identity counts.
- Counts of avoided temporary array and nested object copies, plus observational Node timing/heap deltas.

**Interpretation:** `avoidedValueObjects` counts object clones bypassed, not measured retained heap savings. Node wall-clock/heap measurements are **not** phone frame times, GPU metrics, GC pauses or a reliable cross-machine speedup. No simulation clock or factual replay content is altered.

## E5.1 — avoid work *before* structural sharing
- Optional `priorEffects` snapshot argument at the end of the existing `snapshot()` signature; existing users and standalone snapshots retain previous behavior.
- Reuse `reuseFrozenReplayValue()`'s existing JSON-like recursive **value** comparison to share doors, shots, casings, dropped, impacts, grenades, flash bursts and civilian harm events on normal frames.
- Do not trust live object identity: the simulation mutates door states, effect ages and positions in place. Deep-copy source values on any difference.
- No reuse on independent keyframes or forced same-time replacements. Existing post-snapshot sharing is unchanged.
- No representation, frame rate, mission result, visibility, historical discovery or archive-schema changes.

## E5.2 — one truthful recording cap
- Check `frames.length >= 12000` at the very start of `capture()`, before plan, ballistic, door or manifest captures.
- Drain pending ground without appending it, mark `complete=false` / `truncatedAt` / reason only once; never silently extend a capped archive.
- Guard `capturePlanning()` as well, preventing paused edit revisions from extending beyond the final recorded frame.
- Before cap, live 60 Hz motion and event journals and 20 Hz outcome frames continue unchanged.

## Acceptance
1. Exact source and archive parity; stable-frame pre-clone object reuse; copy-on-mutation for **all eight** families, full keyframe ownership, and no aliasing of live mutated data.
2. Existing P7/P8 replay sharing, medical/civilian/shot/door capture and historical disclosure contracts; all post-cap writers stop, pre-cap shot/plan still recorded.
3. Complete critical architecture and affected-domain integration, TypeScript, build stamp and Pages production validation.
4. Keep tests critical and fast; no unstable timing threshold. Commit stages on the feature branch and merge at a logical release checkpoint only after prior production deployment is healthy. If `main` advances, verify source compatibility first.
5. After release, E5.3 should inspect real multi-minute browser/phone heap, GC and session cleanup. E5.0–2 do **not** claim device gains or solve every remaining retention issue.
