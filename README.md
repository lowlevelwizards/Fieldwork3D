# Fieldwork 3D

**0.0.5 — The First Crew**

A mobile-first, isometric Three.js and TypeScript game about doing purposeful work in a physical world. The original [Fieldwork](https://github.com/lowlevelwizards/fieldwork) is preserved as an architecture/reference archive.

## Try the two-person service operation

Open https://lowlevelwizards.github.io/Fieldwork3D/

1. Rook and Mica start near the service truck.
2. Tap the relay cabinet by the shed; Rook approaches and opens it. Tap **INSPECT FUSE**.
3. Once Rook finds the damaged fuse, Mica autonomously walks back to the truck-side equipment box, opens it and retrieves **one physical spare fuse**.
4. Mica navigates back to Rook, holds out the part and completes a close-range handoff. This job persists even if Rook moves away during delivery; Mica adapts to Rook's current position.
5. Tap **REPLACE FUSE** and **RESTORE POWER** near the cabinet. The replacement is consumed in the cabinet, the tower beacon starts blinking, and the crew returns to the truck.
6. When both crew members arrive, tap **ANOTHER JOB** to replay without refreshing or editing the browser's storage.

The job does not silently auto-complete: collection, handoff and return depend on real physical proximity. The crew obligation is held in an easily testable, pure TypeScript state machine, separate from rendering and navigation.

## Controls

| Input | Action |
| --- | --- |
| Tap/click ground | Route Rook |
| Tap/click cabinet | Rook approaches and works on it |
| Cabinet chip | Inspect / replace / restore |
| Lower-left drag | Floating movement joystick |
| Lower-right drag | Floating horizontal orbit joystick |
| Pinch / two-finger twist | Zoom / rotate |
| Drag upper scene | Pan view |
| Tap the supply box | Supply context; return route after repair |
| Truck chip | Return crew / repeat operation |
| WASD / arrows | Direct movement on desktop |
| F, Q, E | Focus Rook / rotate view |
| M | Toggle synthesized audio |
| Shift+R | Reset operation on desktop |

The interface remains quiet: the only persistent labels are place, in-game time and weather; work actions appear in the world only when relevant.

## Structure

- `src/crew/crew-mission.ts`: deterministic obligation and component ownership, transition guards, return and replay.
- `src/crew/companion-controller.ts`: follower, navigator and task executor for Mica.
- `src/crew/truck-depot.ts`: working supply compartment and the single transferable physical spare part.
- `src/actors/operator.ts`: two visually distinct low-poly operators, walking, glancing, work and handoff poses.
- `src/fieldwork/`: cabinet and staged physical repair.
- `src/input/`: orthographic isometric camera and floating touch controls.
- `src/navigation/`: collision-aware A* routing.
- `src/audio/`: mobile-aware procedural wind, footsteps, repair sounds and powered relay hum.

## Development

Node.js 22 or newer.

```sh
npm install
npm run dev
npm test
npm run check
npm run build
```

On push, GitHub Actions tests the project and deploys the compiled Vite output through Pages.

## Milestones

- 0.0.1: Cedar Relay scene, operator, movement and pathfinding
- 0.0.2: floating controls and more grounded movement
- 0.0.3: minimal HUD and true isometric orthographic view
- 0.0.4: functional relay cabinet and individual repair
- **0.0.5: two-person cooperation, physical supplies, autonomous delivery, handoff, return and replay**

Next: improve visual body dynamics and hand-placement, more convincing tool physics, dynamic site disruptions and additional roles, without rebuilding a huge AI framework.
