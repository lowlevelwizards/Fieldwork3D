# D1 continuation — One coherent crossing system (architecture audit)

## Sources of authority (audit as of November 13, 2026)

| Concern | Single authoritative component | Retained justification |
| --- | --- | --- |
| What the player wants | `PlanNode[]` and order lifecycle | Immutable during execution, intentional WAIT/WATCH never silently discarded |
| Who is projected to cross first | `planDoorSchedule` / one schedule per GO | ETA includes WAIT; cached until planning resumes; rank is a *preference*, never a full-width door reservation |
| Who should defer a physical step | `coordinatePassage` | One per-session lane / transient forward-progress claim; no route authoring, body translation or hinge updates |
| Who can physically cross | Existing swept motor, oriented squeeze and hinge/world clearance | Non-negotiable reality check; never replaced by rank, timed grace or display |
| Which direction a touched leaf may be pressed | `breach-door-pressure-frame` + physical hinge | One incidental impulse per touched door/tick; checks crossing claims lazily; uses shared `activeDoorCrossingIntent` |
| Recovery around a physical obstacle | Existing fixed-clock motor and D2 rehearsed maneuver | Physically swept, bounded, no repeated A* per tick |
| Displayed queue number | Read-only preview of GO schedule | UI may update on real plan edits but cannot own simulation |

## What was fighting itself

1. The passage coordinator first imposed `leaderDepth+QUEUE_CENTER_GAP` regardless of lateral alignment, then imposed a second depth barrier for actual same-lane peers, then separately tested real 2-D gaps. An off-axis leader could therefore block the entire aperture even when an independent body-wide corridor existed. **Removed the blanket leader-depth reservation**. Higher-ranked bodies only constrain projected depth if actually in the follower's corridor; 2-D gap and swept motor remain in place. The outward swinging leaf keeps its distinct physically required temporary staging.
2. `breach-door-pressure-frame` independently reconstructed an active actor goal and omitted door-ID matching on a cached episode, while `breach-door-pressure-arbitration` had its own otherwise overlapping implementation. Both now consult one current-authored-order intent predicate. This is **not** a second queue authority.
3. `breach-order-movement` built a full friendly-position array for every active MOVE tick even though only a very near target could use it. The final-position settle logic now creates that array only in the 20-unit arrival envelope and only includes teammates able to affect any of its 14–20-unit clearances. This preserves existing swept settling without allocating during travel.

## Deliberately retained

- Full-sized body sweep and squeeze, real door leaf and furniture.
- Per-schedule ranks (not recomputed per motor tick), implicit four-person squad entry, fixed-clock per-door owner.
- Outward swing staging, physical wall glide, one-time idle operator yield, D2 rehearsed leaf bypass, opposing-flow retreat and rare leader promotion. Each addresses a distinct *physical* event, unlike the removed duplicate rank-depth gate.
- Legacy `passageWait/passageScheduledStep/passageFollowerStep` exports in `breach-passage.ts` remain for historical test/lab callers; they are **not invoked by the production actor motor**. Do not layer them back into the production path. Removing them requires migrating callers in a separate low-risk cleanup.

## Acceptance / caution

The queue must never create an imaginary barrier for a *laterally free* crossing, yet a same-lane follower must maintain the actual body gap. Stopped operators lose movement-claim readiness but remain physical occupants; a real narrow opening cannot be penetrated to satisfy an order. WAIT on HERE/any waypoint is included in GO-time ETA and its pending order does not reserve a threshold.

Run the bounded source-domain regressions, Q0–Q4 queue tests, real door pressure and four-person cases, strict Q5/Q6 70-case matrix (55 passable, ten genuinely blocked, five genuinely obstructed), R7 generated building checks, and production typecheck/build. No claimed universal world success or mobile speed gain without additional representative measurements.

This change removes competing checks instead of adding timers, new navigation simulations, controller layers or per-frame work.
