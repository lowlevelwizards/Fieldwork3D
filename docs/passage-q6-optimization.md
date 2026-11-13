# Q6 — measure the actual squad-entry process, then optimize

## Source of truth and scope
This work uses the unchanged 60 Hz Session, authored planSquadEntry, motor, hinge
physics, route-intel constraints, Q2 passage coordinator, and D0–D6 swept
collision. The opt-in `scripts/diagnose-passage-q6.mjs` records actual
per-operator STACK, SYNC, DOOR, GATE and ENTRY durations, no-progress frames,
real distance/backtracking, motor state and real hinge milestones. These are
**simulated seconds**, not phone render timing.

## Root causes from the original slow case
Outward-left/stack-right baseline:
- Final stack arrival **4.767 s**; operator Rook is waiting at SYNC for
  **4.267 s** (arrived by 0.517 s).
- First physical crossing **8.350 s**, fourth crossing **15.883 s**.
- Vale's final entry MOVE lasted **12.700 s**. Of that, **4.633 s** was
  effectively stationary and only **1.433 s** was recorded as a passage hold.
- Deeper real-motor tracing exposed **335 world units** of entry movement for
  Vale, with **109 units moving away from the authored destination**. Grip,
  squeeze, a transient nav detour around an outward-moving leaf and repeated
  sub-step hesitation were the dominant costs. This is not primarily a slow
  opening animation or a safely fixable queue-gap constant.

## Accepted Q6 process contracts
1. Generated STACK orders use regular walking across the distant approach
   (more than 36 units from their stack goal), then resume cautious footwork.
   A user-authored WATCH is never accelerated.
2. Generated ENTRY orders retaining the generated stack gaze use controlled
   0.90 movement instead of permanent 0.70 template tracking pace; weapon
   readiness, authored fixed look and the same motor/collision stay intact.
   Ordinary authored WATCH, running and manually authored strafe do not change.
3. A visibly ajar hinged door needs **physical push-through**, not a
   redundant explicit OPEN that chases a moving handle. The already-existing
   fixed swept body contact and hinge motion are still authoritative.
4. At a real physically stable open leaf, a **bounded 1.25-second-cooldown**
   check can replace a generated ENTRY's clearly inefficient transient nav
   with the existing D2 rehearsed door portal route. Every segment undergoes
   full-radius swept clearance; no new authored MOVE, collision exemption,
   teleport, extra general A* or position mutation is granted. Long or unsafe
   alternatives are rejected.
5. The **full extended 70 outcomes** (55 successful traversals, 10 correct
   locked/wedged negatives, 5 correct cabinet obstruction negatives) are
   authoritative. A new tail gate fails if any passable case exceeds the
   last known production baseline: fourth crossing 15.9 s and full completion
   18.5 s. Existing stricter Q5 core p90/worst remain enforced.

## Measured outcome: same real 60 Hz matrix

| Metric | Q5 production | Q6 accepted |
| --- | ---: | ---: |
| 20-case squad fourth-cross median | 10.42 s | **9.03 s** |
| 20-case squad fourth-cross p90 | 14.42 s | **11.93 s** |
| 20-case squad fourth-cross worst | 15.883 s | **13.067 s** |
| 20-case squad worst all-orders finish | 18.483 s | **15.167 s** |
| Extended 55 traversable fourth-cross median | 9.05 s | **8.17 s** |
| Extended 55 fourth-cross p90 | 11.72 s | **11.32 s** |
| Extended 55 worst fourth crossing | 15.883 s | **15.817 s** |
| Extended 55 worst full completion | 18.483 s | **17.883 s** |
| Physical outcomes | 70/70 expected | **70/70 expected** |

In the original worst outward-left/right entry, Vale's fourth crossing fell
from 15.883 s to **12.350 s**, while real travel/backtracking reduced from
~335/109 to ~262/64 world units. In outward-right/45° the last crossing
improved from 15.633 s to **10.283 s**.

## Rejected iterations, not hidden in the passing denominator
- Faster distant stack alone: 55/55 traversed, but core p90 worsened to
  14.68 s; unsuitable by itself.
- Faster generated ENTRY before repairing ajar sequencing: 54/55 traversed.
  One operator chased the leaf while faster followers overtook the opener.
- Skip ajar OPEN without the short portal: all 55 traversed, but an ajar
  angle-45 case took 19.833 s, worsening the complete 70-case distribution.
- Q6.6 forced explicit ajar OPEN followed by an opener-owned WAIT gate:
  **52/55**, with three real ajar deadlocks. Explicitly reverted.
  A waiting squad cannot physically push through the leaf to release a
  trapped opener.

## Known remaining work
The extended worst is an ajar/outward/45° fourth crossing at 15.817 s.
The diagnostic shows a real slow physical creep/repeated narrow-leaf wait
rather than unresolved clipping. Future work should use the same phase,
path-length, forward-progress and per-case diagnostic gates to shorten that
remaining tail; do not lower legal body clearances or weaken negative
obstruction expectations. Run a fresh generated-site/live mobile check before
claiming all world-generated doors have 100% success. Q6's 100% is scoped to
this explicit Door Test Range acceptance matrix.
