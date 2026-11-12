# P2.3 — Operator simulation hotspot breakdown (2026-11-12)

## What the A/B experiment established

Two iPhone 60-second performance reports were compared:

| Observed RAF callback intervals | A: every-RAF idle 3D (default) | B: opt-in 30 Hz idle 3D |
|---|---:|---:|
| Live callbacks | 1317 | 699 |
| Live intervals >=33ms | 131 (9.95%) | 141 (20.17%) |
| Live intervals >=67ms | 2 (0.15%) | 14 (2.00%) |
| Idle callbacks | 1313 | 2146 |
| Idle intervals >=33ms | 20 (1.52%) | 46 (2.14%) |
| Idle intervals >=67ms | 4 (0.30%) | 5 (0.23%) |
| Worst idle RAF gap | 1560ms | 213ms |

The very long idle A gaps were only 12ms of preceding JS and have
**unconfirmed** cause. A and B used different live/idle proportions and
not necessarily identical activity. The short-interval frequencies do
not show a consistent B improvement, so do NOT enable 30Hz idle 3D by
default. The experiment remains available at `?idle3d=30`.

The B capture also recorded 208ms of simulation from operator-ash
and 115-144ms from operator-rook. A had a separate 82ms operator-vale
simulation spike. These are actionable CPU costs but `operator-<id>`
previously encompassed LOS/threat identification, authored order
dispatch and physical motor/pathfinding, so the culprit was unclear.

## Read-only profiling contract

When and only when an authoritative `stepSession` probe is supplied
(`?perf=1` in the browser runtime):

- Keep the original `operator-<id>` CPU phase timing.
- Add `operator-<id>/threat-scan`: LOS/perceived target scan
  in the authored order executor.
- Add `operator-<id>/orders`: full order execution time, including
  early-returned WAIT, movement, door and interaction orders.
- Add `operator-<id>/motor`: all physical motor calls invoked
  from the movement-order handler. This is a **nested** CPU cost
  already contained in /orders; it must not be added to total simulation.
- Add `operator-<id>/idle-passage`, /traversal and
  `operator-<id>/enemy-policy` when applicable.
- Diagnostic child timings go directly to the existing callback
  and do **not** reset the sequential total actor-phase timer.
- Compact COPY and full TXT reports append up to three largest
  sections to the preceding hot operator phase, e.g.
  `SIM operator-rook 144ms [orders 138, motor 132, threat-scan 3]`.
- No changes to movement authority, player orders, pathfinding rules,
  enemy AI, collision, fog, visuals, recording, frame caps or shadow maps.
- Production runs with `?perf` off still take the original
  uninstrumented motor callback.

## Next targeted work based on same-device report

If `motor` dominates, isolate path recalculation vs collision/recovery
and fix the specific repeated work (without skipping collision checks or
weakening doorway queue rules). If `threat-scan` dominates, audit
authoritative occlusion and repeated LOS queries. If `orders` dominates
but `motor` and threat are small, measure medical/interactions/door
and waypoint state. If the remaining bottleneck is `enemy-policy`,
audit AI reevaluation and routing, not player locomotion.

Do not equate `RAF - previous JS` with measured GPU execution time.
