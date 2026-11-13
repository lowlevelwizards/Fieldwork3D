# Q0–Q2 — Deterministic doorway passage release

## Q0 — Instrumentation (implemented)
Opt-in, bounded 60-second/10-Hz Door Test Range trace records threshold-relative position, GO-time rank, passage wait, motor pause, backward travel, leaf-yield, idle-yield, and deadlock-retreat requests. A request is distinct from actual displacement. Data is included in the Copy Report.

## Q1 — Stable holds and bounded corrective motion
- Waiting in a valid queue slot is stationary: zero requested displacement, zero velocity, and no generic repair/replan.
- A leaf may displace someone only through an actual safe full-size body sweep. Remember once-per-opening corrections; never accumulate backwards nudges every frame. A blocked real hinge stops rather than clipping through people.
- A truly idle operator can yield once per approaching episode; avoid repeated motion away from a door indefinitely.
- Intentional WAIT/WATCH, authored routes and physical collisions remain authoritative. No teleport, repeated retreat waypoints, or squeeze relaxation.

## Q2 — Single passage coordinator
- Compute per-door, per-approach-side crossing slots once at GO/resume from authored route ETA; different thresholds can have different numbers.
- Door handler is not automatically entry lead. Pre-entry STACK, handler OPEN and deliberate WAIT do not block a *ready* teammate from crossing.
- Use a small fixed participant roster and one shared coordinator with live actor positions. Do not rebuild traffic arrays, clusters, and sorted leases once per operator per tick.
- Prefer original rank, preserving authored LOOK/WATCH. Use at most one bounded promotion for a genuinely blocked, uncommitted lead, with explicit reason.
- A same-direction convoy advances at a ~20-unit center gap. The next person enters when the leader's body leaves enough clearance at the throat; the leader need not reach the destination.
- Opposing traffic cannot simultaneously claim an occupied throat. A real counterflow deadlock is the only reason to trigger the bounded existing physical retreat.
- Both sides of a pair of doors and aligned vestibules remain collision-safe; never permit fake passage through leaves, furniture, or teammates.
- Muted rank symbols in the full game are planned for Q3. Rank is stored per crossing, not per character.

## Q1–Q2 release gate
- Zero queue-caused backwards drift across 30 seconds of intentional HOLD.
- Tests for four independent MOVE and squad entry plans, WAIT override, opposite direction, paired leaves, inward/outward hinges, stalled handler, grip and replay.
- Existing physicality, D0–D6, full generated-site R7 corpus, typecheck, build and Pages verification are mandatory.
- D6's 11-building, 15-second audit demonstrated incomplete journeys; preserving physical invariants is not proof that all routes will finish. Record failures honestly and audit longer horizons separately.
