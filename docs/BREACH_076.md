# Breach 076 — Persistent Facing Rules and Contextual HUD

This is a surgical gameplay correction, not another large feature expansion.

## The fundamental rule

**Locomotion and aiming are independent.** A waypoint says where the soldier goes.
An aiming order says where the soldier faces while following later waypoints.

- **LOOK** — Choose one facing direction at the node. This **cancels any
  existing PIE or STRAFE lock**, briefly turns the soldier toward that direction,
  then restores normal movement-facing for subsequent waypoints.
- **STRAFE** — Hold the selected *world-space direction* while moving. Translation
  can be forward, sideways or backwards and is not locked to aim direction.
  Unlike the old per-segment STRAFE toggle, this persists across any number of
  later waypoints.
- **PIE** — Choose a *world-space point* to watch. At every motor tick, the soldier
  rotates toward that exact point as their position changes. PIE does **not**
  generate a circular path, change route topology, or require a door to work.
  It persists across later movement waypoints until LOOK cancels it or STRAFE /
  another PIE replaces it.

Commands can be attached to a selected waypoint (begin on reaching that node),
or placed as an independent stationary order at the end of the authored plan.
Both are undoable. They don't teleport or skip obstacles. Turning is gradual. PIE and STRAFE allow movement while
turning to the assigned aim; the discrete LOOK command can pause briefly to
establish the requested direction, then releases the lock.

An emergency **STOP ON CONTACT** remains a deliberate priority override,
if that existing option is enabled.

## Controls

The *always-visible* HUD now has only **Rook**, **Moss**, **BACK −1**, **TOOLS**,
and **GO**.

- Tap map: create movement.
- Tap a planned waypoint: select it and show contextual **LOOK**, **PIE**,
  **STRAFE**, **DELETE**.
- Tap an operator: select and show **LOOK**, **PIE**, **STRAFE**.
- Tap **LOOK / PIE / STRAFE**, then tap the desired direction or world-space
  tracking point; the order is authored without changing movement.
- Near a door, additional **STACK**, **OPEN**, **KICK** appear based on the
  selected actor's *planned* position.
- TOOLS reveals occasional commands: undo/redo, wait/sync, crouch, stop on
  contact, mission variants, reset, and 3D camera presets.

One-finger camera orbit on empty ground, two-finger pan and pinch-to-zoom,
and the 2D reference mode are retained. The horizontal and vertical orbit
directions are reversed again from Build 075 for the requested touch feel.

## Compatibility

The old physical arc creation functions and segment-level `setStrafe` remain
in the code for existing tests and historical comparisons, but are no longer
used to author new player PIE/STRAFE orders. The new user interface always
creates persistent aim instructions.

The 3D model heading and the tactical vision field still use the same
authoritative `heading` value.

## Verification

`tests/breach-076.test.mjs` covers fixed-direction strafing during actual
movement, dynamic target tracking as position changes, later LOOK replacement,
and undoable node-attached aiming.

`scripts/capture-breach.mjs` checks the five-button HUD on phone,
contextual order placement, door actions near planned nodes, GO/PAUSE,
and horizontal/vertical orbit directions.
