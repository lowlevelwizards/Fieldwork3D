# FIELDWORK / RESTART 052 — BREACH ONE

The earlier terrain simulator, soldier walkaround, and art study are **shelved**,
not imported into or authoritative for this game. This is an independent
**tactics-first** build in the existing repository. Never delete history merely
because a prototype stopped serving the design.

## The central premise

An **original** top-down pause-and-plan tactical game inspired by the
interaction grammar of Door Kickers. The first implementation borrows the
*mechanics of freely plotted soldier routes, multi-operator coordination and
real-time execution with pause*, not their art, levels, story or proprietary
code.

The immediate reason to play: **Can two soldiers clear two rooms without
losing either of them?** Every correct order should matter.

## Version 052: one authored encounter, no open world

- Compact two-room rural station with one exterior door, one interior door,
  two friendly soldiers, two hidden enemies and several physical obstacles.
- Select **ROOK** or **MOSS** with canvas tap or bottom buttons.
- Tap open ground to append a tactical destination. Drag from an operator
  to sketch a longer route. Selected unit retains its plan separately.
- Routes use a bounded A* grid to avoid *walls and furniture*, then are
  executed with real movement, rather than instant teleportation.
- **LOOK** then tap a point to set the selected operator's initial facing.
- **GO** starts movement simultaneously. **PAUSE** freezes the world to
  inspect, amend or clear planned orders. Space toggles on desktop.
- Door stays a physical sight blocker until a soldier approaches; the
  interaction opens the door. Nearby sentry reacts to sound.
- Vision is directional, sightlines physically blocked by walls, closed
  doors and furnishings; enemies are hidden until a friendly spots them.
- Automatic exchange of fire is deterministic and deliberately simple;
  soldiers can be lost. The scene is restartable.
- UI deliberately minimal; map readable even on a phone.

## Current intentional omissions

This is not a feature-complete Door Kickers clone. Not yet implemented:
timed synchronized go-codes, fireteam orders, explicit door stacking, peeking,
grenades, ballistic projectiles, suppressive fire, hostages, wounded evacuation,
loadouts, enemy roaming AI, friendly fire or campaign/faction simulation.
Those systems come **only after route planning, vision and the one first
encounter feel satisfying**.

## Input contract

Mobile: select an operator by unit button or tapping their marker. Tap a
destination; drag from their marker to sketch a route. Tap GO to execute,
PAUSE to revise. LOOK plus map tap chooses facing. CLEAR erases that unit's
remaining plan. Pinch / two-finger drag zooms and pans the map.

Desktop: same pointer behavior. 1/2 selects, L look, X clear, SPACE
play/pause, R reset, mouse wheel zoom.

## Review gates

1. The opening map is legible in portrait with both soldiers and two doors.
2. Both operators can be routed through both doors without path stalls.
3. Enemy positions are **not** given to the player before observation.
4. Pausing truly freezes movement, enemy decisions and fire.
5. Doors are meaningful sight and movement boundaries.
6. Loss is plausible, plans can be revised and the scenario can be restarted.
7. No old 3D/world simulation runs or blocks the tactical view.
8. Do not enlarge the mission until mobile path authoring feels precise.

Open `breach.html` in Vite / GitHub Pages once merged. The old `index.html`,
`world.html`, and `study.html` continue to exist strictly for historical
comparison; the next decision is whether this should become the main entry.
