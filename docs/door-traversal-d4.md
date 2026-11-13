# D4 — Continuous physical support-hand door handling

## Scope and ownership

D4 finishes the hand-grip layer over D0 session-owned geometry, D1 crossing episodes, D2 rehearsed footwork and D3 fixed-tick pressure arbitration. This is **not** a new physics engine or a second pose controller. Real hinged door collision, swing limits, wall/furniture and actor swept obstruction remain authoritative.

### D4.1 — Physical hand attachment and retention
- Only an active player crossing can acquire a grip, and only after the real body-pressure solver reports a genuinely contacted and legally assisted moving leaf.
- The same pure `DOOR_HAND_ACQUIRE_REACH` distance is enforced in the hinge's hand-assist policy and D4 acquisition; hand assistance cannot occur from the old broad general door interaction radius or when the hand is busy.
- The contact is a fraction anchored on the rotating pivot-to-tip leaf (handle preferred, otherwise a reachable point on the panel), **not** a saved room coordinate. This gives stable handed interaction independent of hinge side and rotation.
- A short arm ray is checked against the session's indexed static walls. The hand cannot reach through masonry to pull an opposite-side leaf.
- One persistent grip is held for the *entire reachable crossing*, not a one-tick flag. Each pre-hinge fixed tick checks only actors with active/releasing grips. No global scan is added for other operators.
- While attached, the hand may request the existing `PUSHED_OPEN_LIMIT` target. The original physical hinge motor and real swept obstacle clearance decide whether the leaf can actually reach it. D4 never directly sets `openFraction`, pushes actors, disables collisions or injects repeated impulses.
- Release when the actor clears/cancels the crossing, the door becomes held/wedged/closed, physical reach or wall line-of-reach is lost, or hand availability changes (reload, treatment, throwing, sprinting, real combat contact, incapacitation).
- Retain a 240-ms **visual-only** release record; no hinge force, grip ownership or remote holding remains after release. The next tick drops the record after the envelope completes.

### D4.2 — Existing IK hand ownership
- `OperatorPose.doorGrip` is a read-only presentation signal. Existing `resolvePoseContactOwners` decides left-hand ownership, retaining medical/reload/throw/death priority, firing hand on the weapon.
- The same existing support-arm two-bone IK consumes the moving physical contact point. The reach envelope smoothly transfers left hand from the weapon to the panel, holds as long as physically attached, then returns.
- Sustained door grip **does not shift the torso or the shot-time weapon**; tests caught and corrected the previous door-reach torso lean's impact on right-hand/weapon placement.
- D4 doesn't change authored LOOK/WATCH, body heading, traversal targets, muzzle ballistics, magazines, recoil or squad scheduling. It doesn't add a second animation clock, IK solver, or per-actor shadow pass.

### D4.3 — Replay and Door Test Range
- Grip fraction, true point, acquisition and release timestamps are snapshot in `ReplayActorFrame`, with an optional field for pre-D4 archives.
- Presentation reconstructs the current leaf point from the replayed hinge geometry; the release path uses the last actual point, not a speculative live lookup.
- `door-test-range.html` shows the actual support-hand-to-leaf link in the 2D lab, grip mode and releasing status in the operator diagnostics, and includes contact in copied reproducible reports.
- The existing 3D rig and animation pose consume exactly the same `doorGrip` contract as live gameplay.

## Acceptance and measurements

The focused D4 workflow runs:
- Physical hand acquisition, moving angle tracking, rejected remote/locked/wedged grabs, interruption and release tests
- Pure time envelope, replay-seek stability, actual 3D two-bone output, immutable firing hand and weapon, hand ownership hierarchy, old-film compatibility
- Full real 60Hz four-operator entry for both outward hinge placements, requiring at least one **real** attached hand, no door-state ping-pong, full-body reach at every sample, original order completion and release
- D2–D3 four-way hinge acceptance; R7 existing door intent/outward entry and D1 original crossing compatibility
- `npm run build` with TypeScript and Vite

Earlier D4 measured 30-second real-session corpus (before adding strict D4 live grip gate):
- Inward-left: 4/4 finished, 0 true hand grips
- Outward-left: 4/4 finished, 2 true grips, longest 10.283 seconds
- Inward-right: 4/4 finished, 1 true grip, longest .650 seconds
- Outward-right: 4/4 finished, 3 true grips, longest 5.517 seconds
- Every configuration retained one initial door opening and **no** later open/close flip.

These are real gameplay counters, not a mobile fps benchmark. Live device profiling can be used to judge any actual frame-time change. The D4 hot path is inactive unless a physical grip exists; ray tests use the session's spatially indexed wall query.

## Non-goals
- No collision ghosting, imposed teleport, per-frame pathfinding or changes to D2–D3 staging.
- No automatic hand force without actual physical reach.
- No new permanent complex arm animation state machine; existing pose contact authority and solver remain singular.
- No manual UI action to force a fictional grip from across a room.

## Release process
Feature branch `feature/door-traversal-d4-continuous-grip-20261112`; stage commits retained. Merge only the integrated D4 PR after focused tests and all required checks pass, no earlier Pages deployment remains queued, and the previous publicly served Pages stamp matches the previous successful main build. Then verify the new Pages stamp before considering D4 deployed.
