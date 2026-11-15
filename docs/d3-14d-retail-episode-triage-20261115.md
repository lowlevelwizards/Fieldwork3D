# D3.14D — Retail authored MOVE outside-leaf episode triage

Date: 2026-11-15. Source baseline: merged/deployed D3.14C2 SHA 0461449a73e14265893c3b480b387a87f350a74f, GitHub Pages successful with exact public build-stamp verification.

## Frozen independent case

The earlier fifth blind holdout plus D3.14A three-case source audit exposed retail small site-index 3 seed 5412896, authored Rook. At 45 seconds the operator remained near (268.7,366) around an open D2 entry with the original GO near (128.4,313.5), approx 158.95 world units away. Four-person team movement was partially productive, but Rook repeatedly chose 14 door rehearsals, 16 initial-intel routes, 3 actual open-leaf overlap escapes and one accepted bounded local portal. The episode persisted as `outside-leaf`, and movement in several five-second windows exceeded 200 physical units with net displacement under 8 — a **genuine source-ownership / re-entry loop**, not a slow but continually advancing large-map team.

This distinct D2 pattern should not be treated with the same recovery as D9 Vale's sustained narrow squeeze or FRONT Rook's full-body lane-cycling. Both of those are now independently fixed and deployed, with historical 80/88 physical-arrival, zero-physics-violation acceptance.

## Stage D — read-only feasibility

Run the same 2700 fixed 60Hz ticks and original generated seed on the newly deployed C2 motor. Retain the complete per-source transition record, episode phase/maneuver, real door leaf and position, known-intel route versus the full-body world-to-goal route and next operable-door prefix. Check every world-route segment against the actual current full-body physical sweep, rather than assuming an empty temporary route or the presence of rehearsed waypoints proves safety.

No actor, door, PlanNode, collision, physics time or nav is written by this workflow. The comparison is a single offline post-run diagnostic, not a new live A*. If a true legal physical GO route exists, prioritize preventing route rehearsal from overriding a materially progressing route; if not, diagnose genuine leaf/frame geometry before changing motor ownership. Never count short portal-only stages as authored MOVE arrival.

## D3.14D read-only results — 45-second real motor, CI green

[Immutable 60Hz retail audit](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43688213824). Exact seed5412896, small retail authored Rook:

- Team: **3/4 physical arrivals**, Rook remaining **158.95** units from authored GO `(128.4,313.5)`, final actual position `(267.563,390.307)`. Zero physics violations, invalid positions, corrupted plans or simulation exceptions.
- D2 is genuinely **open at fraction 1.55** and stationary, real door leaf from `(251,381)` to `(226.229,404.290)`. Rook's full body is currently clear, with episode `approach/outside-leaf` and no blocked-time accumulation.
- Repeated *identical* source-level witness: `door-rehearsal` **14** times, `initial-intel` **16**, real `door-leaf-escape` **3**, plus one earlier accepted `door-escape-local-portal`. At 36.35, 38.97, 41.58 and 44.2 seconds, the same rehearsed `[(269,407),(269,359)]` is chosen from near `(246.474,397.830)`. After each episode the motor re-acquires the stale intel path near `(268.883,361.550)`. A full **~244 units of real physical walking every five seconds** yields only a few units of net progress.
- The *current intel route* `[(272,400),(144,400),(128.4,313.5)]` has **one physically illegal segment**, despite being plausible in remembered map geometry.
- The **actual world-truth authored-GO route exists now and every segment is full-body swept clear**: `(267.563,390.307) → (256,416) → (208,416) → (144,400) → (128.4,313.5)`, approximately **230** units of genuine physical travel. Its first leg is legal. The first-future-operable-door route is empty because no extra door is required.
- Three other squad members are physically at their original destination vicinity. This is not a justified delay caused by a large map or a four-person queue.

**Recommended D3.14D2 source-level fix:** after a bounded number of *real, separately observed accepted rehearsals* for the same actor, authored MOVE, stable physically open D2 and near-identical body anchor without significant GO-distance reduction, attempt exactly one cold **world-truth complete-goal route** using the existing motor's full-body `sweptBodyClear` for every proposed leg. Adopt a temporary route only when its last waypoint is exactly the original GO. Protect it from immediate rehearsal reselection for a bounded lease that ends on real displacement, goal edit, material hinge change or time. Normal motor still physically steps every waypoint and opens or pushes any later door normally. Never teleport, grant passage through an obstructed leaf, adopt a short portal as GO, or release WATCH/queue rules. The evidence argues for a route-source ownership repair, not a collision/door-force change.

## Acceptance for any future gameplay candidate

Require real physical improvement on the frozen retail case and unchanged 80/88 historical full-body arrivals, no worse stalls or loops. Pair against an eighth independently frozen 22-map cohort before a main merge. Recheck D9 and both motel cases and FRONT Rook. Merge only as a coordinated release checkpoint after main CI is green and prior Pages deployment verified. No remote door OPEN, collision waiver, arbitrary 45-second completion deadline or unbounded per-tick route search.
