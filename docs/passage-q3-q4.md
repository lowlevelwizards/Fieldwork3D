# Q3–Q4 — Continuous squad threshold flow, visible rank, leaf-aware staging

## Full release scope

### Q3.1 Continuous fixed-geometry convoy
- Reuse the Q2 GO-time per-door/side schedule and one session-owned coordinator.
- A follower may take *available forward distance immediately*, without waiting
  for the leader to reach a distant waypoint or a timer to expire.
- Preserve the real two-dimensional center-to-center clearance and full-body
  physical door sweep, both inward and outward.
- A valid WAIT/HOLD never produces a reverse displacement; deliberate
  LOOK/WATCH/PIE and authored MOVE vectors are never synthesized or replaced.
- Conservative promotion remains a once-per-door exception for a truly blocked
  uncommitted lead. Rank cannot oscillate per tick.

### Q3.2 Visible, mutable-by-plan *per-threshold* ranks
- Show small, muted numbers ONLY for operators with a planned passage through
  a physically identified known threshold. No permanent squad ranks.
- Draw discrete actor-colored rank glyphs on the floorplan and in the 3D
  projected planning overlay, at each planned threshold in multi-door routes.
- The actor's next-rank cue must change after clearing the first threshold,
  then disappear when all threshold crossings finish. During actual execution
  show the fixed GO-time schedule, not reranked route guesses.
- Intentional plan edits, undo/redo and tactical pause must invalidate the
  *planning preview*, but the projected overlay must not run full route
  searches and sorting every render frame. Use a bounded session-local cache
  with cheap invalidation and the existing known-route planner.
- Replay and any plan-hidden mode must not reveal new rank/disclosure cues.
  Keep the existing node numbers distinct from door *entry-order* badges.

### Q4.1 Door-swing envelope and staging
- Compute orientation relative to the **actual hinged leaf** once per
  door/side when constructing the passage context. Preserve Q1/Q2 authored
  outward entry stack anchors, and gate subsequent approaches against a
  cheap conservative leaf sweep envelope when an outward leaf is in motion.
- No waiting operator continuously retreats to hold the preferred gap;
  the minimum safe distance is a one-way cap and a stationary hold.
- An actual hinge obstruction is allowed to stop the door. No ghosting,
  teleporting, or shortening the capsule when opening is inconvenient.

### Q4.2 Stable physical correction library and hand continuity
- Reuse D2's deterministic leaf-tip bypass. Extend its finite fixed pattern
  only if needed for genuine leaf-tip or jamb obstruction; choose once per
  recorded traversal episode, not a new route every simulation tick.
- Use existing exact wall/leaf/body swept checks for every candidate, and D4
  physical contact to open farther if the safe chosen path remains obstructed.
- Physical hand acquisition/release and authored gaze survive a correction.

### Q4.3 Acceptance and release gate
- Pure multi-threshold rank preview tests (GO-time order differs at each
  door, numbers disappear when none pending, plan mutation invalidation).
- Continuous 60-Hz four-person passage tests with no mandated fixed wait
  between bodies; 30-second hold generates zero backward motion.
- Real inward/outward, left/right, paired, locked, wedged, furniture,
  two-way traffic, 11 generated-layout R7, D0–D6, D4 live hand grip, build.
- Do not label physical iPhone performance measured from Node CI. Use Q0
  optional trace and the existing 60-second in-game mobile profiling.
- Commit feature branch stages; merge and deploy only at the Q3–Q4 release
  checkpoint, after Q0–Q2 Pages is serving the correct build and all
  critical physical tests are green.

## Non-goals
- No automated LOOK sectors, player-facing manual rank assignment, new
  combat AI, per-frame global route searches, new collision solvers,
  or authored path rewriting. UI rank is not a mechanical MOVE order.
