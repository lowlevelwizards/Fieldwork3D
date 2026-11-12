# Release 1 — Tactical Reliability & Encounter Baseline

Feature branch: `feature/release1-tactical-reliability-20261112`
Starting main: `6d86b7c4b42cd646d08038fd0749954f13862649`
Release PR: #1262 (draft until critical checks and Pages checkpoint pass).

## Scope and owned changes
- **R1.1 / TF4**: `breach-tactical-frame-feedback-controller` uses the owning Session geometry bounds and the same finite-point helper already used by pointer authoring. No aiming/physics/fog edits. Real seeded non-origin/expanded map bounds regression in `ux2-order-previews`.
- **R1.2 / TF2**: `notify` preserves the old rolling, deduplicated narrative but records distinct, capped semantic delivery IDs. The existing audio controller drains new IDs in order without replaying stale events after audio unlock, Session reset, or replay; cue selectors/mixing and the historical replay audio timeline stay unchanged.
- **R1.3 / TF1**: the HUD notice feed classifies existing `executionEvents` by typed kind and reason rather than parsing the outcome string. Contact, injury and other narrative alerts stay on the existing path. Typed status display does not edit orders or learn hidden geometry.
- **R1.4 / LE10**: optional `npm run audit:mission-quality -- 11 --behavior` constructs independent, seeded real Sessions; a fixed 90-tick quiet period precedes an explicit acoustic stimulus, followed by observations to 360 ticks. Reports distinguish intended/active populations, rooms, state transitions, movement, investigation progress, stalls, idle time and combat observations. It is explicitly not a real-device FPS test or a human playtest.

## Critical release checks
- `tests/ux2-order-previews.test.mjs` plus pointer/gesture behavior.
- `tests/breach-audio-controller-step6.test.mjs` and replay sound compatibility.
- `tests/ux2-execution-feedback.test.mjs` plus HUD palette regressions.
- `tests/release1-encounter-behavior.test.mjs`, Session/mission semantics and TypeScript/build.
- One final-head architecture critical workflow (not only a skipped job).
- One final-head phone/desktop WebGL tactical + Replay/Bodycam + Operator Lab acceptance.
- Prior production Pages completed successfully and the public served stamp matches its main SHA; no queued/running deployment when merging.
- Single Release 1 merge checkpoint then verify exact new Pages SHA publicly served.

## Deferred intentionally
No AI behavior, civilian population distribution, movement routing, simulation phase, scenario generation, fog disclosure, replay archive schema, operator pose, sound catalog, or persistent storage migration. Real iPhone Safari and mobile thermal measurements remain manual acceptance.

## Rolling ledger
- [x] R1.1 committed.
- [x] R1.2 committed.
- [x] R1.3 committed.
- [x] R1.4 committed.
- [x] Fixed synthetic-fixture and optional room-ID type regression discovered by CI.
- [ ] Exact final-head critical + browser acceptance green.
- [ ] Previous public Pages stamp and release queue clear.
- [ ] One PR merge and exact post-merge Pages public verification.
