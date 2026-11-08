# Phase A — Squad-flow release contract (A0)

**Baseline:** main `7b783651202814aa9a14f1bd76d1d071dd4cd313` (2026-11-08).

## Scope / authority

Release 1 improves **execution** of player-authored routes and explicitly requested squad-entry templates. It is not an automatic room-clearing AI. No new user-facing controls, tactical pause, hidden-intel access, hard friendly-body collisions, or new plan nodes are permitted as incidental movement improvements.

- Keep `breach-game.ts` + `breach-movement-authority.ts` authoritative for body motion and impacts.
- Keep `breach-passage.ts` the single source of doorway crossing/convoy decisions.
- Keep `breach-entry-lanes.ts` the generated interior-slot allocator; `planSquadEntry` continues to own the explicit, undoable template transaction.
- Keep manual MOVE, LOOK, WAIT, WATCH, stance, and fire policies untouched by generated-entry conveniences. In particular, explicit WATCH must survive both *during* and *after* an entry MOVE.
- Do not infer hidden occupancy or concealed furniture from planning-time probes; a planned destination may be thwarted by newly observed world geometry at execution time.
- If the geometry cannot support four valid entry slots, fail the optional template without modifying any player's existing plan. Never manufacture clearance or teleport.
- Keep friendly passing soft and forgiving. Never introduce new hard friendly collision gates to make one fixture look tidy.

## Existing golden fixtures (reuse, don't duplicate)

1. `node --experimental-strip-types --test tests/squad-flow-a1.test.mjs tests/doorway-convoy-flow.test.mjs` — follower gap, partial strides, counterflow, full-session four-person passage.
2. `node --experimental-strip-types --test tests/squad-entry-b-sectors.test.mjs tests/squad-entry-b-continuity.test.mjs tests/breach-149.test.mjs` — generated lanes, fallback, precise physical look handoff, atomic undo and authored WATCH.
3. `node --experimental-strip-types scripts/audit-squad-flow-a.mjs` — measured standard, narrow, paired and obstructed thresholds; *do not* conflate overlapping stress destinations with normal entry.
4. `node --experimental-strip-types scripts/audit-squad-entry-b.mjs` — real generated four-person entries, legal spacing, blocked hinges and sector handoff.
5. `npm run check && npm run build` at the **release checkpoint**, plus Pages artifact/stamp verification; don't run the full historical test suite for each small stage.

## Diagnostics and acceptance

Record the existing audit JSON and compare **the same cases** before and after. Review crossing order, first/last threshold crossing, full-stop causes, arrival, close-pair locations, actual route blockage, legal goal spacing and look handoff. Any failed passage must explain whether the blocker is the real door leaf, body, furniture or order; do not 'fix' test results by relaxing swept-body clearance.

**Fail release if:** authored plan changes without player instruction, a player WATCH disappears during a generated entry, entry ends on the wrong physical side, geometry is crossed without physical clearance, a valid doorway deadlocks, or a regression introduces repeated stops/squeezes. Visual review on a supported mobile device is required before claiming movement *feels* better; automated audits prove correctness but not animation quality.

## Delivery

- A0 records this contract and reuses existing tests/audits.
- A1: narrowly fix validated physical stack geometry and movement issues.
- A2: ensure explicit player attention remains authoritative through generated entry completion.
- Keep stage commits on this feature branch. Merge one combined release only after targeted tests and deployment readiness are confirmed. Never stack new merges over an in-progress Pages deployment; verify the served build stamp after every production deploy.
