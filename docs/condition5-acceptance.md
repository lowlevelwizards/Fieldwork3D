# Fieldwork 3D — Condition 5.0 acceptance checklist

## Primary visual goal

At **normal tactical zoom** and the same seed, scale, room and camera:
- 0 (pristine): clean materials and almost no accumulated marks.
- 25 (used): lightly worn grout, traffic/corner dirt and subtle variation.
- 50 (worn): clearly visible mottling, corner buildup, scuffs and discoloration.
- 75 (neglected): large-area finish shift, stains, cracks, exposure and debris.
- 100 (decrepit): strong asymmetrical degradation across floors, walls, fixtures
  and exteriors without obliterating material identity.

The slider changes the scene's **surface history**; it must not relocate physical
walls, doors, furnishings, objective zones or navigation.

## Pinned map seeds and facilities

Pin 120 clinic, 126 garage, 127 warehouse, 128 restaurant, 134 apartment,
141 utility and 158 office. Check ISO, top-down, close and normal zoom.

1. At each seed, press Map Lab 0 CLEAN then 100 DECAY with the same camera.
2. Check floor grout, concrete, carpet and wood aging differ materially.
3. Check wall/baseboard grime, window runoff and water-related areas.
4. Check fixtures and doors age according to material.
5. Check exterior zones transition between pristine and neglected.
6. Enable Facing; verify chairs face tables/desks or the room's useful focal
   direction, without breaking physical collision and door access.
7. Play This Site; confirm the selected condition is visible in the mission.
8. Return to Map Lab and scrub rapidly; observe UI responsiveness and GPU
   resources over repeated resets and long-play sessions.

## Performance and critical regression

Automation verifies deterministic condition gradients and capped small debris
budgets, renderer geometry, map-lab wiring, typecheck and production build.
Physically rendered room-wall overlays must be profiled on an actual phone
before claiming mobile FPS improvement; automated code tests cannot establish
visual quality or device frame timing.

**Known scope:** Condition remains visual-only. A 100-valued decayed
building does not automatically become structurally unsafe or modify doors,
ballistics, pathfinding, enemy behaviors, or objective clearance.
In-progress wear histories are deterministic by site and condition and are
not yet persistent across campaign visits.

## Follow-up observations to capture

Record seed, building, scale, condition value, platform, zoom and screenshot
for anything that reads too clean, too homogeneous, too dark or too noisy.
Prefer adjusting source materials and room-scale condition masks over raising
the count of discrete decals.
