# Release 3 — Tactical Execution Reliability
Draft PR #1267. Original main: 9c92d5fc88d3aaf66706988cf2b47709f29ea252.

## Scope backed by existing owners
1. R3.1 TM2 — bounded recovery using existing motor; reject unchanged path repairs and schedule next attempt, preserve authored goal and temporary door/actor recovery.
2. R3.2 TF3 — actionable structured blocking issues with actor and order ID. Locate using the existing unit-selection path; no involuntary Undo, reroute or new HUD authority. Handle already-retired orders safely.
3. R3.3 TM3 — full-body swept sidesteps ≤40 units preserve both fixed and tracked authored WATCH. Leave squeeze, sprint, true corners and contact authority unchanged.
4. R3.4 TM1 — real-world actor motion renews temporary passage lease; stalling outside the throat ceases to renew it; earliest GO-time scheduled rank near the throat is retained through delays. Existing single-owner collision, deadlock retreat and queue remain authoritative.
5. R3.5 TM4 — handle-side door staging avoids bodies at its target; short correction for an existing DOOR action uses existing physical motor with bounded distance and recovery limits, never teleports or auto-opens a picked lock.

## Deferrals
No rewrite of A*, simulation clock, door swing collision, civilian AI, authored plan schema, replay archive or aiming policies. No disclosure of hidden blockers or map geometry. No additional production builds within release.

## Critical gates
- [ ] New scoped recovery/notice/WATCH/passage/door regressions.
- [ ] Existing four-person GO-time crossing and squad movement corpus.
- [ ] Deterministic replay, physical collisions, 60 Hz tests and architecture.
- [ ] Production TypeScript/build + Pages stamp.
- [ ] Real-WebGL phone/desktop tactical, replay/bodycam and Operator Lab.
- [ ] Prior Pages completed success, served build matches current main, queue clear.
- [ ] Single PR merge and exact public deployed SHA verification.
