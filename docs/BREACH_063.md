# Breach 063 — Precise Orders

This is a targeted improvement to the working Breach mission; the map,
combat model and other game prototypes are preserved.

## Undo without collateral damage

**BACK −1** removes only the final pending order for the selected soldier.
It does not clear the full route, affect completed orders or reset either
operator. Unlike undoing a whole stroke, it removes *one node*, even if
a finger gesture produced many.

**UNDO** reverses the previous editing action, including one whole finger
stroke; **REDO** reapplies it. The existing **ALL CLEAR** command still
erases the selected soldier's remaining plan, but is deliberately named
differently so it cannot be confused with BACK.

Undo and BACK are available while paused; execution freezes and already
performed orders are not resurrected by editing. Shared synchronization
codes are removed from both operators if BACK removes the paired sync node.

## Strafing

1. Select a movement waypoint, then press **STRAFE** to enable or disable
   strafe on the segment that leads to that point. Or, with no node selected,
   press STRAFE to arm the next tapped destination / finger-drawn stroke.
2. Select the node and use **LOOK**, tapping where the weapon should face.
3. On execution, the soldier walks *laterally* at a reduced rate, weapon
   pointing in the assigned direction while position follows the route.
   Default movement instead faces travel and applies any LOOK heading on
   arriving at the waypoint.

Each strafe segment is labeled in the plan. It is reversible and persists
as an editable plan-node property.

## Pieing a doorway

1. Plot a normal MOVE to one side of the door, approximately **27–108
   map units** from the door center. An initial position close enough can
   work without a separate move.
2. Choose **PIE ↶** or **PIE ↷**, then tap the *door*.
3. The planning preview shows a nine-step, **54-degree** curved sweep.
   The whole sweep is one authored order and thus one BACK operation.
4. During execution the soldier advances slowly along the physical arc,
   continuously turning the weapon toward the door opening rather than
   following tangential movement direction.

An invalid pie order is **rejected before execution** if it would clip
through a wall, door or solid furniture, or if its radius is outside the
supported limit. The player can reposition or choose the opposite sweep.
Door opening remains a separate deliberate order; pieing does not
magically open a closed door.

## Desktop shortcuts

- Backspace: BACK −1
- F: arm next STRAFE segment
- [ and ]: select counterclockwise / clockwise pie direction
- L: LOOK
- Ctrl/Cmd+Z: UNDO; Ctrl/Cmd+Shift+Z: REDO
- Space: run or pause

## Verification

`tests/breach-063.test.mjs` covers single-order undo, per-gesture undo,
paired sync backtracking, movement while aiming away, validated arc geometry,
completion of the sweep and dependency validation when preceding waypoints
change. The dedicated mobile browser capture audits BACK, STRAFE, LOOK and
PIE in portrait as well as earlier mission controls.

## Explicit limitations

This is a purposeful first version of **doorway pieing**, not arbitrary
polygon corner pieing: sweeps use the center of an authored door as their
pivot. Future expansion to freestanding corners should add explicit
corner anchors and validate exposure per step, rather than assume that
sweeping around a door works for every corner.

Gameplay visuals and feel require a real phone playtest before merging.
