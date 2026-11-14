# D3.2 R2 — physical body/hinge deadlock
Base: R1 deployed `b358849b2b9fd4c435eedceb45da5887390f8985`, public Pages build verified `b358849b2b9f-mwgi83t9`.

## R2.0 — forensic self-blocking hinge clearance (offline)
- Seed 31175 clinic entry: Vale, ~9.008 units from D6 leaf at 37.2% open, angularVelocity=0, self-body blocks further swing. Full world route unavailable and known-intel fallback's first leg intersects that solid leaf. Additional physical-block attempts are normal recovery, **not** a movement license.
- Capture actual selected hinge's endpoint/hinge/swing geometry and, at only the 1.7s/3.4s physical-block milestones, test a small deterministic radius/heading set of fully swept sideways/retreat possibilities. Report candidate gap, progress toward authored goal, and other-actor occupancy without choosing or executing movement. A no-options result distinguishes truly impossible clearance from a missing safe sidestep. All candidate sweeps use the existing authoritative collision function. No live motor checks, independent physics or extra GO-time controller.
- Preserve locked/wedged/held, original authored orders, Q5/D1/D5, and zero teleportation.
## R2 follow-up
If witnesses show a viable self-clearance, integrate a single bounded correction through existing collision recovery and queue arbitration, with direct regression for seed 31175. If no viable clearance exists, identify whether a different operator must advance instead. Every correction must prove increased arrivals, without hinge ping-pong, queue inversions or added per-tick scans.

## R2.1 — existing motor, physically swept hinge self-clearance
R2.0 11-site real motor witness demonstrates legal clearance in clinic 31175. In entry mode Vale self-blocks hinge D6 at fraction .372, 9.01-unit leaf gap, 0 angular velocity. A fully swept 8-unit southeast step changes the gap to 15–17 and clears the hinge, with no operator occupying the landing. In authored mode Ash self-blocks D6 at fraction .572 and has similarly valid 8-unit relief, though Moss may also need to continue.
The **existing** physical collision recovery branch, when actually blocking on a door for >=.85s and passing its usual route retry gate, can enqueue at most one small fully swept relief point before the current transient nav. Only explicit MOVE with no active DoorTraversalEpisode, no pending climb, and max 4 retries qualifies. The point must increase clearance to the selected leaf by >=3 units, release the actor's self-block of further hinge opening, be unoccupied (radius >=17), and pass actual swept-body and static hinge sweep checks. No position mutation, teleport, special collision exemption, new per-frame scan, new timer, extra physics object, or authored order edits. The existing motor moves the actor on the next tick; a full ordinary route retry remains available if no safe relief exists.
Acceptance: 5/11-site actual generated arrival/progress vs R1, D1/D5/Q5 70-case physical stable; door oscillation <=90, no new sidestep ping-pong or regression to squad entry. Revert if no meaningful benefit.

## R2.1 measured result — useful but not release-ready
The same-seed 11-building R7 real-motor audit after the bounded self-clearance step:
- **Physical-block endpoints 3 → 0** versus R1, no invalid positions, oversized steps, or corrupted authored plans.
- Clinic seed 31175 entry Vale changed from 0 recent net displacement and 3.88s blocking to 15.9 world units recent movement and 0 blocked time. Ash also resumed moving in the authored scenario. Across 11 sites, count of recently moving operators rose from 27 to 30.
- Full four-operator plans remain 6/22 within the short 15-second audit, 41/88 individuals completed.
- Door logical state flips rose **81 → 89** across 11 sites, with clinic entry 16 → 21 and house entry 20 → 23. This oscillation risk needs diagnosis before release; Q5 70-case, D5, Ground Zero and exact gameplay parity all passed.

## R2.2 — read-only door flip attribution
Add offline-only per-door logical open/close flip counts to each generated-site mode result. Distinguish one leaf repeatedly ping-ponging from normal opening of multiple unrelated leaves. No live simulation changes. The R2 release remains DRAFT, unmerged, undeployed until this is understood and oscillation is acceptably controlled.

## R2.3 — one touched-door pressure authority, physical near-leaf owner
The R2.2 11-site per-door attribution confirms real ping-pong: **clinic D6 toggles 20 times** in entry mode (R1 15), and house D2 toggles 22 times (R1 19). The old pressure policy relies on signed crossing intent and can fail to protect an operator whose transient nav crosses a hinge without a DoorTraversalEpisode. A short self-clearance step can therefore let another body CLOSE the same hinge immediately.
Correct the existing `inspectDoor` touched-leaf actor loop: an alive operator with active MOVE/PIE whose actual capsule is within `OPERATOR_RADIUS+7` of an OPEN leaf protects this door from incidental same-side CLOSE and marks real aperture occupancy, even if signed crossing recognition did not acquire an episode. Only the already once-per-tick **touched-door** arbitration checks physical near-leaf geometry; no global per-frame scan or new state. Explicit user CLOSE remains authorized once occupancy clears; collision and locks remain solid. Do not infer intent from distant authored goal. Protect moving shoulders for the short physical near-contact interval and release as soon as body moves out of it.
Acceptance must show D6/D2 flip counts do NOT regress and physical clinic progress remains; preserve D1/D5/Q5 and zero invalid movement. Otherwise reject.
