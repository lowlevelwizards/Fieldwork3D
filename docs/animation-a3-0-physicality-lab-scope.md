# A3.0 — Physicality Lab and measured baseline

## Scope / no gameplay changes
A3.0 augments the **existing legacy Physicality Lab** rather than replacing it. The older isolated traffic/passage simulator retains its existing URL and tests. A new **A3 Physicality Lab** uses the real Breach `newSession`, `stepSession`, `weaponClearance`, `assessFireLane`, `teammateAheadForHandling`, `chooseCarry`, and optional single-rig `poseOperator` output without replacing any live gameplay authority.

### Deliverables
1. Dedicated build entrypoint, linked from the existing Physicality Lab, Door Test Range, and launcher.
2. Reproducible seeded scenarios: unobstructed, front stack, left and right stagger, two-level crouched, moving teammate, doorway and furniture obstruction. One-to-four participating operators; controlled stance, aim intent, weapon family and shooter bearing (-45/-25/0/+25/+45 degrees). A direct top-down canvas with accurately labeled **current** muzzle, shot line, 2D friendly guard disk, doors/cover, and blocked state. No misleading depiction of future 3D body volumes, micro-lean solver or A3.1+ behavior.
3. Deterministic explicit 60 Hz step, run/pause/reset; no simulation advancement during inspection. Lab-only test setup must never alter Quick Play/Campaign state or persist rules.
4. Readouts: shooter, target, weapon carry, clearance, blocker, actual muzzle, candidate **legacy** sidestep (not executed unless the game motor requests one), actual motor recovery, blocked/recovery counts, actor position/posture, door contacts, action/hand owner and pose/foot diagnostics from the existing operator rig (label these as rendered rig, not shot authority).
5. Copyable portable JSON reports that identify scenario/options/seed/tick and stable actor/door snapshots plus non-deterministic **separate** real-time probe timing. A JSON trace is reproducible by replaying the same fixture/ticks; no localStorage.
6. A focused test matrix proving scenario construction, identical fixed-step snapshot results for matching input, current muzzle/shot agreement, safe blocked outcomes, reset, and no impact on gameplay code; plus typecheck/build and a browser smoke when toolchain permits.

### Invariants
- *No* new shooting permissions or firing-line geometry; current 10.5-radius planar guard remains visible and explicitly described as baseline.
- No movement, pose, door, contact or collision algorithms change; no direct writes to live site/game globals outside isolated lab setup.
- Pure scenario fixture and diagnostics functions may import existing gameplay modules, never the reverse.
- Existing Footstep scheduler is authoritative for posed feet. Do not infer game-level planted anchors from 3D preview; label separately.
- Full live simulation reports use actual actors and stage, not proxy virtual players.
- All new scenarios use fixed seeds; no Math.random() or wall-clock timestamps in stable snapshot, and elapsed CPU timing never participates in state.
- No auto-merge/deploy on PR creation; release only after all critical checks and previous Pages publication verify.

## Gate
A3.0 complete means fixtures + actual lab controls + export + case matrix + baseline benchmark + reproducibility + build and browser smoke pass. Future A3.1–A3.13 gameplay improvements remain explicitly out of scope.
