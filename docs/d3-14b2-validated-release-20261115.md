# D3.14B2 — Coordinated bounded squeeze-leaf release checkpoint

Date: 2026-11-15. Integrate read-only D3.14A evidence plus D3.14B2 scoped physical microstage through **one** main-targeted release. Parent draft diagnostic PR #1445 is evidence, not a separate production merge.

## Confirmed cause

Townhouse standard seed 5532875 generated ENTRY: Vale remained at (298.73,457.20), near fully opened and stationary D9, 180.72 world units from the original GO. The actual full-body and oriented squeeze paths to the first known-intel waypoint (296,496) were both blocked, while an immediate intel route was repeatedly reacquired. Earlier source diagnostics saw 130 actual leaf escapes and 130 re-acquisitions, with essentially no net physical progress. Existing H4 future-door routing had no safe prefix.

A read-only, one-time post-run sweep revealed several 4–8-unit physically legal sideways steps. A bounded exploratory graph found **six** 4-unit oriented-profile segments around the solid leaf, followed by a fully swept narrow join to the existing route. This is not a 16-unit ghost clearance or a new authored destination.

## B2 implementation

- Only a generated ENTRY MOVE whose existing door episode is **clear-leaf / grab-and-hold** may use it, after 3 real same-door overlap escapes and unsuccessful normal full-body H4 routes. Real hinge must be open, stable and body fully released.
- A single cold fixed-size search considers at most 96 nodes within 52 world units, maximum twelve 4-unit oriented narrow-body steps. Every edge is checked with the **production sweptProfileClear**, and an endpoint is adopted only if it joins the original first disposable nav node via a physical swept body/profile.
- The complete original disposable route, including the same player-authored GO as final waypoint, is appended. No direct position writing, remote door opening, collision exception, new motion engine or false logical completion.
- Every microstep is executed by the ordinary fixed 60Hz motor. Only stage waypoints have a physically appropriate **0.85-unit completion tolerance**; standard A* and authored movement stay unchanged.
- One cold attempt per unchanged physical door, goal, authored order and local actor position; material movement, door state or player edit is required to try again.
- No live route observer in production. Full diagnostics are opt-in read-only.

## Independently verified 45s tests

| Metric | Released H4 | B2 |
| --- | ---: | ---: |
| Target townhouse ENTRY physical arrivals | 3/4 | **4/4** |
| Vale remaining authored-GO gap | 180.72 | **4.74** |
| Historical 11-site physical arrivals | 80/88 | **80/88** |
| Historical fully arrived squads | 18/22 | **18/22** |
| Historical logically complete squads | 21/22 | **21/22** |
| Historical stall episodes / retries | 8 / 5 | **8 / 5** |
| Historical suspected loops | 0 | **0** |
| Historical A* searches | 2,611 | **2,611** |
| Physical, plan and position safety errors | 0 | **0** |

Focused + historical real-motor CI: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43685670026

### Sixth newly frozen independent 22-map cohort (176 outcomes)

Exactly the same **22 previously unused generated seeds**, 11 archetypes in small + standard sizes, two order modes, 4 operators, 45s at 60Hz for both baseline and B2. The manifest was frozen before either result. Baseline uses immutable production H4 SHA b655efdd79ff244e0ff3d9f681b50c6ef2e2d4e0, with identical read-only audit harness.

| Metric | Released H4 | B2 |
| --- | ---: | ---: |
| Physical arrivals | 142/176 | **142/176** |
| Fully arrived squads | 27/44 | **27/44** |
| Logical completed squads | 31/44 | **31/44** |
| Stall episodes / recovery retries | 20 / 137 | **20 / 137** |
| Suspected loops / sustained still | 26 / 0 | **26 / 0** |
| A* searches | 34,278 | **34,278** |
| Expanded route nodes | 5,077,374 | **5,077,374** |
| Invalid body, physics violations, authored order corruption | 0 | **0** |

**Interpretation: no additional new-map physical arrivals gained or lost.** This is a specific, reproduced, real recovery, NOT a claim that all entry/squeeze loops are fixed. Independent paired CI https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43685826166 .

## Release protocol / next work

Merge only the coordinated main-targeted PR after the usual D3 physical, build/typecheck, D5 and D6 tests are green. Do not queue a merge while Pages deploy is running. Verify the new public Pages build stamp after merge; no duplicate merges. The extended historical, three-case and sixth-map workflows are retained for manual checks to avoid recurring expensive PR runs.

**Still open:** P1 townhouse small authored Rook near FRONT with 20 full-body lane replacements and repeated 242-unit 5-second movement loops; P2 retail authored Rook with 14 outside-leaf rehearsals. Also remote implicit OPEN physical approach (rejected old PR #1431), and remaining distinct sixth-cohort loop signatures. Investigate P1 with fixed-clock source ownership before changing collision, never relax real doorway geometry.
