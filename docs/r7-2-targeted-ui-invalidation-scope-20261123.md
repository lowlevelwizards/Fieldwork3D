# R7.2 — Targeted tactical UI invalidation and measurable DOM reconciliation

**Base:** `f9bac0b76e71c7771ff646925f0120dcd05511fc` (R7.1 completed/merged; public Pages build `f9bac0b76e71-mwtu3sy9` verified).
**Branch:** `refactor/r7-2-targeted-dom-invalidation-20261123`.
**Goal:** reduce repeat DOM reconciliation when visual inputs are unchanged while maintaining immediate, correct tactical feedback. **No new scheduler, gameplay state, actor simulation cache, or replay/knowledge authority.**

## R7.0/R7.1 baseline and R7.2 bounds

The fixed 60-Hz GO loop remains in `src/breach-runtime-loop.ts`; it notifies the R7.1 Session lifecycle independently from the HUD. The HUD is scheduled at **120 ms planning / 180 ms running / 750 ms terminal**, plus immediate player actions. `src/ui/tactical-hud-controller.ts` currently reconciles operator cards, quick-state controls, targeted hints, command affordances, mission text, notices, and debrief. E1 already implements equality checks for some text/ARIA/style values, and `breach-mission-debrief.ts` already avoids rebuilding an identical after-action workspace. Retain both implementations. More skipped work is not evidence of improved FPS until measured in a browser.

**Scope exclusion:** Do not add a second RAF or store, defer immediate command feedback, change GO/recording, alter simulation/fog/replay permission, adjust CSS, or skip dynamic notice expiry, active reload/progress, movement, timer, mission text or replay status.

## Complete scope

1. **R7.2.01 — Freeze evidence and ownership.** Keep R7.0/R7.1 owner tests and source-located HUD cadence. Identify the repeated work in quick command buttons and repeated assignment to unchanged operator-card DOM properties; distinguish existing debrief caching from new work. Record measurable *DOM writes* separately from *reconciliation attempts*.
2. **R7.2.02 — Per-surface semantic invalidation.** Introduce a tiny presentation-only invalidation policy for the existing Quick States command strip, keyed by mounted strip, scope element, actual Session identity and a complete derived view signature. Compute the signature from the real authorized `contextActionChoices` and visible output (operator, selected waypoint/WATCH scope, displayed plan count, active watch status, button labels/titles/disabled/pressed). Do not use seed, simulated tick, plan array identity, or time as a substitute for content. In-place same-tick edits must invalidate immediately.
3. **R7.2.03 — Deterministic remount and visibility.** A new Session, strip DOM remount, scope remount, hidden/re-shown strip or changed choice invalidates. Continue checking visibility and HUD-height synchronization every call: existing ResizeObserver keeps screen height accurate; non-observer fallback is preserved. No false reuse across Campaign/Quick Play/replay/selection transitions.
4. **R7.2.04 — Equality-guard dynamic DOM properties.** Extend the existing E1 DOM reconciliation helper with lightweight equality-check setters for `hidden`, `disabled`, `title`, class flags and optional attributes. Use these in the high-frequency operator-card and phase/notice surfaces, without caching gameplay-derived execution data. New values still appear on the first following HUD paint or immediate command callback. Use existing text/ARIA/style helpers.
5. **R7.2.05 — Preserve dynamic/critical UI.** Keep live operator reload, injury and waiting/progress states, mission clock, GO label, selection/target dots, action availability, notice/blocked-order provenance and expiry, fog disclosure, replay/scrub, and mission debrief refresh on every currently authorized path. Do not memoize mission outcome data or replay historical state. The screen updates on the same existing cadence.
6. **R7.2.06 — Quantitative deterministic evidence.** Add tests using instrumented fake DOM nodes and actual presentation invalidator sequences. Report baseline naive write attempts versus committed mutations for repeated static values, one initial reconciliation versus N repeated equivalent attempts, and guaranteed fresh renders for same-tick edits, WATCH/waypoint, operator, Session, DOM remount, hide/show and disabled changes. Measure counters for actions in tests; don't extrapolate to device FPS or physical browser DOM until browser profiling.
7. **R7.2.07 — Integration and existing CI.** Validate exact owner boundaries and the 60-Hz fixed clock with R7.0/1, E1, replay, HUD, D3 physical and after-action tests. Add no new GitHub Actions workflow, loosen no existing acceptance, and retain conservative fallbacks for non-ResizeObserver embedded browsers.
8. **R7.2.08 — Merge and release gate.** Exact-head specialist routing, architecture/targeted tests, typecheck/build, any required visual/physical acceptance, main reconciliation, prior public Pages SHA verified; then squash merge. Verify successful Pages release **and** the live served build ID, not simply the action's success.

## Key ownership decisions

| Owner | Responsibility | R7.2 change |
|---|---|---|
| `breach-runtime-loop.ts` | Single frame + HUD schedule | Unchanged |
| `breach-session-lifecycle-observer.ts` | Phase, planning recording, completion | Unchanged |
| `breach-main.ts` | App composition and immediate HUD requests | Unchanged |
| `ui/tactical-hud-controller.ts` | HUD and quick-state view | Applies semantic quick-strip invalidation and guarded writes |
| `ui/tactical-dom-reconciliation.ts` | Stateless equality-guarded DOM setters | Adds property/class/optional-attribute guards, no cache |
| `ui/tactical-ui-invalidation.ts` | Local per-view signature boundary | New *presentation-only* helper; no lifecycle/Session mutation |
| `ui/breach-mission-debrief.ts` | Already cached after-action workspace | No duplicate cache or behavior change |

## Quantitative verification protocol

1. Run synthetic no-change cycles after a first rendered strip: expect **1 reconciliation for N identical visible attempts**. Observe changed button values, selections and mount in each subsequent attempt: expect exactly one new reconciliation per change.
2. Instrument fake DOM setters/class/attribute methods: verify identical repeat assignments commit **zero additional mutations**; changed and cleared values write once; compare naive write attempts as a control.
3. Source audit guards no additional RAF, unchanged 120/180/750 ms schedule, retained HUD card/notice/debrief calls and preserved R7.1 lifecycle sequencing.
4. Browser acceptance remains the qualitative gate for tappability, scroll/focus, clipped labels, WATCH/target, reload, notice aging and replay. **No measured real-browser CPU, layout count, thermal, device FPS, or input-latency claim** is authorized by deterministic tests alone.

## Acceptance and rollback

```bash
node --experimental-strip-types --test tests/r7-2-targeted-ui-invalidation.test.mjs
node --experimental-strip-types --test tests/consolidation-e1-dom-reconciliation.test.mjs
node --experimental-strip-types --test tests/r7-1-session-lifecycle.test.mjs
node --test tests/r7-0-ui-orchestration-audit.test.mjs
node scripts/verification/r7-0-ui-orchestration-audit.mjs --check --out artifacts/refactor-r7-0
npm run build
```

The new test lives in the existing architecture gate and critical suite. An invalidation defect is rolled back by reverting the single UI helper/hot-path refactor, not by weakening the GO, recorder, or existing HUD acceptance. R7.3–R7.5 are future phases.
