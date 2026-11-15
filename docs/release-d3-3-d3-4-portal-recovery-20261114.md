# D3.3–D3.4 — action-aware portal recovery and stale episode ownership

Feature continuation on draft PR #1395, following R2.6 `37f805825b3e295bb68b791d0cbae7a1df0b6d74`.
**Not a production release.** No merge, deployment, or live collision exemption.

## Evidence-driven implementation

1. D3.3 stages a bounded **future-door** route only on an already-failed
   physical world replan. The ordinary 16-unit routefinder, known-intel
   planner and exact collision motor remain unchanged. A separate cold
   8-unit route search accounts for legitimate routes outside the local
   A* padding. Locked, jammed, wedged and held leaves are never future portals.
   The returned route ends at the first physical door contact, not the next
   door or the authored destination. The real door motor still opens it.
2. The 30-second clinic seed 31175 disclosed a new wall stall after Vale's
   long route: Vale at (178.82,272.45), next (176,288), `lastBlocker=wall`.
   The same already-existing full-body world solver found a swept-clear
   local connector via (170.95,271.02) to (176,288). D3.4 P1 reuses that
   connector on the existing rate-limited wall/furniture recovery branch;
   no second mover or extra per-tick route search.
3. D3.4 P2 identified the actual architectural conflict: a stale
   `FRONT` DoorTraversalEpisode remained in `cross/blocked` even when
   the body was more than 110 units from every nearby door, preventing
   the local connector from being admitted. The existing episode lifecycle
   now releases a remote, direct/push `cross/blocked` episode past the
   110-unit real-frame threshold. Preserve active `outside-leaf` rehearsal,
   near-threshold claims, and authored orders, without touching nav or
   physical positions. This is one cheap squared-distance gate only for
   an already-active episode, not a new global per-frame scan.
4. D3.4 P3 freezes the actual-arrival regression in the focused CI,
   alongside the 30-second frozen R2.6 same-seed comparison, and records
   per-door flip attribution. One existing duplicate 11-site D3 audit was
   removed since the R7 workflow owns that suite.

## Actual same-seed clinic 31175, 1,800 ticks

| Measure | Frozen R2.6 | D3.4 P2 |
| --- | ---: | ---: |
| Entry actors actually arrived | 2/4 | **3/4** |
| Vale actually arrived | no | **yes** |
| Vale remaining goal distance | 104.24 | **4.66** |
| Vale total blocked time, s | 21.63 | **0.15** |
| Vale completed authored MOVE | no | **yes** |
| Clinic both-mode logical door flips | 4 | 7 |
| Invalid physical moves / corrupted orders | 0 / 0 | **0 / 0** |

This is a long-run measured improvement for **one** real clinic scenario.
The route is longer than the direct-line plan because it legitimately
navigates around closed portals; do not claim fastest arrival or general
squad closeout. The three extra door transitions may reflect the SERVICE,
D4, D3 route; this needs actual per-door audit before declaring every flip
intentional. No blind door-force or collision pass-through was added.

## Same-seed 11 generated-site, 900-tick quality

R2.6: 6/22 whole squads, 41/88 classified completed operators, 45
door-state flips, 1 physically blocked endpoint, no invalid positions.
D3.4 P2: 6/22 squads, 41/88 completed classifications, **46** door flips,
**0 physical-block classifications**, 0 invalid physical moves and
0 corrupted orders. This 15-second window is too short to demonstrate
the clinic's new arrival. **Do not report overall reliability closeout**.

## Critical verification

At D3.4 P2 commit `f8ec72c02e29874be04e59bc91ed42e2fcf8baa7`:
- [Focused D3, real clinic 30s, base parity, TypeScript/Vite all green](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43622830351)
- [R7 11-site /900 tick squad acceptance green](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43622830486)
- Q5 70-case, D1/D2/D5/D6, Ground Zero, P2.8 and P2.10 critical gates all green.
- New focused tests: real swept local connector, refusal on impossible wall,
  remote stale CROSS/blocked release, retention of a real near crossing
  and outside-leaf maneuver, unchanged authored and transient plans.

## Remaining release checkpoint

- Confirm per-door transition counts for clinic and house; no return to
  20x D6 or 22x D2 ping-pong.
- Measure 30-second (or longer) 11-site actual arrivals, separate from
  15-second classifications, and bound CPU costs for the cold 8-unit route.
- Respect production sequencing and confirm latest Pages served build
  before any merge/deploy.
- Keep this PR DRAFT and all results on its feature branch until
  broader improvements and CPU gates are convincing.
