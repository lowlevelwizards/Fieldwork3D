# D3.16B — Fixed MOVE target feedback (frozen motel Ash)

## Real failure

In motel SMALL seed 31149, authored Ash reaches (585.60, 248.91) after
real motor movement, but the unchanged player-authored GO (619.30, 248)
lies inside non-relocatable, already-discovered fixture geometry.
The exact GO remains **33.71 world units away** after 45 simulated seconds.
The D3.10B fixed-goal guard correctly retains its MOVE PlanNode with one
terminal-for-now issue and stops repeating useless world-route searches.

Do **not** project the goal into arbitrary nearby space, invalidate it,
remove it, claim arrival, push the fixture, bypass collision, or reveal
undiscovered cover. This is not a motor deadlock; it needs a player edit.

## Player-facing improvement

After a **real stalled move of at least 3.5 seconds**, within 64 units of
the authorial goal, the existing motor guard considers **only player-known,
non-relocatable wall or furniture**. It emits one of:

- `MOVE BLOCKED · GO INSIDE FURNITURE · DRAG WAYPOINT TO CLEAR FLOOR`
- `MOVE BLOCKED · GO INSIDE WALL · DRAG WAYPOINT TO CLEAR FLOOR`

This same issue is persistent on the active authored node. It is displayed
by the existing operator execution status and typed feedback feed; the
existing warning click already locates the matching operator and PlanNode.
Existing recovery guidance gives concise visible-floor/wall-side editing
instructions, not a fake verified replacement point.

The issue clears only when the **same held node's** authored goal changes,
a different order starts, or world geometry revision invalidates the
original obstruction. A different ownership issue is not wiped.
The hold uses the existing WeakMap and performs **no new motor-tick route
searches, scan loops, or gameplay writes** beyond the already existing
speed=0/block-clock and the one-time warning.

## Paired baseline physical truth

D3.16A distinguishes:
- 80/88 physical arrivals, 18/22 physically arrived four-person squads
- 9 terminal cancellations among operators, including 7 physical
  non-arrivals, 2 actors who **did** physically arrive after a cancellation
- 1 still-pending physically obstructed MOVE (Ash)
- 16/22 strict success squads with all four physically arrived and zero
  cancelled orders

D3.16B must preserve these historical numbers, real 60 Hz collision,
and the exact frozen motel unchanged GO/order/cancellation evidence.
Release in a **single D3.16 checkpoint with D3.16A**, never as a separate
rushed Pages publish.
