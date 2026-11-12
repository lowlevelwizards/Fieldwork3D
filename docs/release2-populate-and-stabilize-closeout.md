# Release 2 — Populate and Stabilize the World

Draft PR #1264. Starting production main `6c9e1eb7d872746b3cf7d89ba5c1d4d5d78fb096`.

## Current codebase evidence and boundaries
- Worldgen already has `civilianBudget` and `planCivilians` with true collision, route, clearance, mission and seed contracts. A nominally inhabited seed can request a civilian and still place none because the route budget concentrates on one room. No random fallback spawn is permitted.
- `assembleSession` explicitly opts into civilians from the real site; keep `enableCivilians:false`, rescue identity and legacy replay opt-out behavior.
- Existing motor and cooperative doorway rules are authoritative. TM10 is only a regression corpus, not a second route authority.
- `assignEncounterActivities` described simulated work, seat and conversations that only had idle micro-pose, not physical interactions. LE9 removes this discrepancy without falsely implying a full civilian/hostile animation overhaul.
- `stepCivilianResponse` already uses physically heard sound and confirmed line of sight; `chooseCivilianRefuge` verifies physical routes. LE4 improves state decisions from new evidence, not actual motor or knowledge.

## Four staged commits
1. **R2.1 / LE1** — per-room bounded candidate/route budget, safe placement stats and shortfall explanation. Do not change hostile RNG, mission budget, or safety rules.
2. **R2.2 / TM10** — opt-in `node --experimental-strip-types scripts/audit-movement-quality.mjs 3 240`, real seeded Sessions, four operators and observational stalled, passage, squeeze, retry, incomplete-arrival and invalid-coordinate metrics. No gameplay changes, report observational results rather than hard-code desired success.
3. **R2.3 / LE9** — armed actors get actually expressed idle, watch or physically verified patrol; invalid patrol becomes visible watch. No invented conversation/fixture interaction.
4. **R2.4 / LE4** — civilians in freeze, hiding, fleeing reconsider only when a newly perceived threat changes their safety assessment; bounded cooldown and real route checks. Preserve compliant, escorted, wounded and incapacitated priority, physical position authority, paused simulation and replay.

## Release acceptance
- [ ] Existing civilian B2/B4/C2/C5 and E5 field smoke tests.
- [ ] Real generated seeded civilian count / physical placement assertions, reasoned shortfall diagnostics.
- [ ] TM10 collector and real seeded movement command pass.
- [ ] Ambient/pose assignment tests; no unsupported generated armed activities.
- [ ] Fresh evidence / stale evidence / blocked route / recovery civilian tests.
- [ ] Primary CI, TypeScript/build, mission simulation and replay critical suites.
- [ ] Exact final head real WebGL phone/desktop tactical, replay and Operator Lab acceptance.
- [ ] Prior production Pages successful with public build stamp matching current main; no live/queued deployment.
- [ ] Grouped PR merge then exact new main build public Pages stamp successful.

## Deliberate exclusions
No new map generator, new enemy AI, global population increase, forced unsafe civilians, movement solver rewrite, generalized encounter group intelligence, new actor animation rig, replay format migration or extra in-game controls. On-phone Safari behavior and FPS remain human/device checks.
