# FIELDWORK 3D

**0.0.1 — Cedar Relay / The Diorama**

A fresh mobile-first, isometric Three.js + TypeScript Fieldwork prototype. One operator, a small weathered industrial relay site, and a genuinely interactive tactical camera. The original [Fieldwork repository](https://github.com/lowlevelwizards/fieldwork) is deliberately untouched and remains a reference, not a runtime dependency.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite, including from another device on your network.

```bash
npm test       # deterministic collision/navigation tests
npm run check  # TypeScript
npm run build  # production bundle in dist/
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| Tap / left-click ground | Move Rook, detouring around solid obstacles |
| Drag on scene | Pan camera |
| Two-finger pinch | Zoom |
| Two-finger twist | Orbit |
| Right-drag / Shift-drag | Orbit camera on desktop |
| Mouse wheel | Zoom |
| Camera buttons | Orbit, zoom, focus operator |
| F, Q, E | Focus, orbit left, orbit right |
| WASD / arrow keys | Move operator on desktop |

Camera gestures do not issue move commands. Clicking a prop snaps to a nearby accessible position if one exists.

## World and implementation

- **Environment:** generated gently undulating terrain with vertex colors, a dirt-road ribbon, roadside puddles, pine trees, shrubs, low-poly rocks, grass instancing, a repair shed, service cabin, radio mast, parked truck, fences and industrial clutter.
- **Operator:** modular procedural Three.js meshes with visible arms, legs, field pack, walk cycle, heading interpolation and ground-relative placement.
- **Navigation:** a 1m deterministic grid, clearance around buildings and trees, eight-direction A*, corner-cut prevention and line-of-sight path smoothing.
- **Camera:** orthographic tactical projection with eased target/zoom, tap-to-move separated from drag, touch pinch/twist and desktop pan/orbit.
- **UI:** landscape-friendly mobile HUD with safe area spacing, readable focus/zoom controls and operator status.

No AI V2 internals, combat, inventory, faction or campaign logic have been migrated. This is intentional: the aim is to establish the *physical player experience* first.

## Deploy to iPhone through GitHub Pages

The repository contains `.github/workflows/pages.yml`. In **Settings → Pages → Build and deployment**, set **Source: GitHub Actions** to enable deployment. Future pushes to `main` build and publish automatically. The relative Vite asset base supports hosting at `/Fieldwork3D/`.

Expected site after a successful deployment: https://lowlevelwizards.github.io/Fieldwork3D/

## Roadmap

- 0.0.1: Cedar Relay diorama, operator, navigation and camera.
- 0.0.2: richer locomotion, physical interactions and tactile action feedback.
- 0.0.3: one complete, playable repair-and-recovery incident.
- 0.0.4: reintroduce *selected* causal AI concepts through a newly scoped actor architecture.
- 0.0.5: persistence, ecology of operations and a wider working world.

Make one coherent playable slice better before adding more systems.
