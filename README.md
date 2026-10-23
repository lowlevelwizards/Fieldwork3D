# Fieldwork 3D

**0.0.4 — The World Becomes Tangible**

A mobile-first, quiet isometric Three.js diorama about operators doing purposeful work in a physical world. The original [Fieldwork project](https://github.com/lowlevelwizards/fieldwork) is kept intact as a reference. This is a clean Three.js / TypeScript reboot.

## Play Cedar Relay

Visit https://lowlevelwizards.github.io/Fieldwork3D/

The scene starts with an offline utility relay cabinet on the apron beyond the repair shed. Look for the subtle amber marker above its enclosure.

**Repair walkthrough**

1. Tap the cabinet (or its marker) to route Rook to the front of the enclosure. The route avoids buildings, trees and the cabinet itself.
2. Rook turns to the cabinet, kneels and pulls its hinged door open.
3. Tap **INSPECT FUSE** when the localized action chip appears.
4. Tap **REPLACE FUSE** to watch the physical component exchange.
5. Tap **RESTORE POWER** to close the cabinet and activate the tower beacon and low electrical hum.

The repair state persists across refreshes in the browser's local storage. On desktop, **Shift+R** clears the completed incident for testing.

The job is deliberately small and direct. No inventory, mission-generator, factions or AI authority system is imported yet. The pure repair procedure is separate from the rendering and may later be driven by the player or a causal AI actor.

## Controls

| Input | Action |
| --- | --- |
| Tap/click the ground | Route Rook to the waypoint |
| Tap/click the relay cabinet | Approach/interact |
| Context action chip (only near cabinet) | Proceed to the next work action |
| Drag lower left on mobile | Floating analog movement |
| Drag lower right on mobile | Floating horizontal orbit |
| Two-finger pinch/twist | Zoom / orbit |
| Drag upper scene | Pan |
| Mouse wheel | Zoom |
| Right-drag / Shift-drag | Orbit |
| WASD / arrows | Camera-relative direct movement |
| F / Q / E | Focus operator / rotate left / rotate right |
| M | Toggle procedural sound |
| Shift+R | Reset repair state (desktop testing) |

Audio is synthesized locally with Web Audio and starts only after a user gesture, as required by mobile browsers. It includes very quiet wind, footsteps, cabinet latches, tools, switching and a powered transformer hum.

## Architecture

- `src/world/`: handcrafted geometry, stable scene layout, collision footprints, relay state lighting.
- `src/actors/operator.ts`: one articulated character, locomotion, kneeling and reach/tool pose.
- `src/fieldwork/relay-procedure.ts`: deterministic, testable task phases and action obligations.
- `src/fieldwork/relay-site.ts`: physical cabinet door, replaceable fuse, selection surface, work anchor and tower beacon.
- `src/navigation/grid.ts`: pathfinding and movement collision.
- `src/input/`: floating sticks, touch gestures and fixed-elevation orthographic camera.
- `src/audio/field-audio.ts`: low-volume synthesized tactile and environmental cues.

## Run and verify

Requires Node.js 22+.

```bash
npm install
npm run dev
npm test
npm run check
npm run build
```

The GitHub Actions checks run tests and build. On pushes to main, the Pages workflow publishes the Vite production output in `dist/`, not the raw repository.

## Milestones

- 0.0.1 — Procedural relay diorama and pathfinding.
- 0.0.2 — Floating thumb controls and grounded movement.
- 0.0.3 — Quiet HUD and true isometric orthographic camera.
- **0.0.4 — Corrected geometry, staged physical relay repair, contextual interaction, sound and persistent result.**
- Next — More compelling body mechanics, richer interactables and the first complete leave-site / return loop.

Keep the world physical, playable and legible before extending the AI or campaign.
