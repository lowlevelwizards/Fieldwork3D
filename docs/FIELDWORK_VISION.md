# Fieldwork — soldier-first art direction / Build 050

**Promise:** inhabit one fragile person in Verdigris. An intimate, tactile and
uncertain warzone experience, seen from a restrained isometric camera.

## Five pillars
1. **Intimate at a distance.** Rook, not the cursor, is the anchor. The camera
   follows with subtle travel lead; it does not grant a god's view.
2. **Physical ground.** Every ditch, track, fence, slope and tree should affect
   movement or interpretation, not just decorate a simulation.
3. **Human vulnerability.** Silhouette, rifle, kit, stance and gait are readable
   on a phone. Stationary people must not march on the spot.
4. **Quiet atmosphere, sudden violence.** Mute ordinary light and saturation;
   reserve visual/sound contrast for meaningful events.
5. **Beauty through wear.** Practical construction, battered equipment and
   wet rural materials, not glossy toy parts or abstract interface chrome.

## Concrete art language
Painterly low-poly naturalism. Grey-green ambient light, subdued ochre fabric,
charcoal equipment, weathered timber, soil and dusty roadside foliage. A small
authored place: service track, open gate, weather instrument, station yard.
No hovering objective rings, generic procedural clutter or tactical tokens.

## Embodied control contract
- Isometric orthographic follow camera, with a small real-velocity lead.
- Floating left movement/right look touch controls; tap-to-move remains.
- Crouch reduces move speed and visibly lowers the torso and leg posture.
  It **does not yet** change enemy detection or projectile physics.
- Desktop: WASD/arrows move, C crouch, F read, V reset view, Q/E orbit.
- Mobile: dual floating sticks, contextual READ and CROUCH buttons.
- The existing actor motor, physical collision and ground-height queries
  remain authoritative. No second parallel world physics.

## First playable golden sliver
At Cutwoods Field Station, Rook enters the worksite and reads a real weather
sensor only while physically nearby. With the note recorded, leave through
the actual eastern fence gap to complete the scouting pass. No fake combat,
UI-only teleport, world-sized task marker or timer.

This is an *observation and withdrawal*, not yet a satisfying dangerous
firefight. The next isolated gameplay test should be **one credible threat**
whose sightlines and cover make the crouch/approach choices matter.

## Deliberately deferred
Enemy patrols, injury, suppression, campaign systems, procedural towns,
squad commands, biome generators and large tactical HUDs. Preserve the
existing optional ?tactical mode and the original 10m Environment Lab.

## Review checklist
- Readable, grounded Rook silhouette at default mobile framing.
- Clear weapon/equipment attachment, no idle bob, crouch is visibly lower.
- Sensor can be interacted with only in reach, gate cannot finish first.
- Quiet UI; no gold legacy objective torus in default solo scene.
- Camera, touch, terrain queries, tactical mode and laboratory still work.
