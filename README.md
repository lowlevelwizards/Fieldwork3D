# Fieldwork 3D — 0.0.9.1: Twin-Stick First Contact

**Live game:** https://lowlevelwizards.github.io/Fieldwork3D/

Fieldwork is a mobile-first, isometric, handcrafted Three.js/TypeScript world where small teams navigate, inspect, repair, protect, and survive in one continuous environment. 0.0.9 introduces the first **actual combat encounter at Cedar Relay** without replacing the existing operations or porting the legacy Fieldwork AI2 runtime.

## Playing First Contact

0.0.9.1 replaces the original auto-target controls with direct-action input.

- **Left thumb: MOVE.** Rook moves directly relative to the isometric camera.
- **Right thumb: AIM + FIRE.** Drag the right floating stick to turn Rook in that direction and shoot. Aim and movement remain independent, so you can strafe and fire. Releasing the stick stops shooting immediately.
- Bullets travel in the aimed direction, hit real obstacles, and never snap to a selected enemy. An in-world reticle shows the aiming direction.
- Patrols begin farther down the eastern road, approach visibly, and are announced by Mica before they can fire. Their damage, accuracy and cadence are reduced.
- The small ⌖ panel at top right shows ammo, reload ↻, Mica orders and casualty actions without covering either thumb.
- Two-finger twist rotates the camera; pinch zooms; upper-area drag pans. The right thumb never rotates the camera while you are firing.
- When contact interrupts inspection, Rook leaves the work pose and can immediately maneuver. Crew obligations resume afterward.

### Touch controls

| Input | Action |
|---|---|
| Left lower thumb | Move |
| Right lower thumb | Aim and fire |
| Lift right thumb | Stop shooting |
| Two-finger twist or pinch | Orbit or zoom |
| ↻ upper right | Reload |
| Mica order | Follow, Hold, Cover or Withdraw |

### Desktop keys

WASD / arrows move; F/Q/E focus/orbit; M sound; Space service action. New: **C** tactical panel, **mouse pointer + J** aim/fire while held, **G** reload, **V** cycle Mica tactical order.

### Implemented combat foundations

- Real line-segment cover and ballistic obstruction for both sides
- Short-range detection cone, hearing, last-known enemy positions and search
- Physically represented low-poly hostile operators, aiming, muzzle flash, gunshot, impact, recoil/flinch
- Ammo/reload cycles, suppression, injury/knockdown and recoverable incapacitation
- Autonomous patrol routes, enemy fire, approximate cover seeking, retreat when wounded
- Mica covering, following, holding and withdrawing within the same world as field repairs
- Hostile contact affecting the original machine-repair mission; no dedicated combat level
- Mobile controls that remain hidden until the player selects tactical mode or contact begins
- Small fast pure-simulation tests around sight, hearing, cover, ammo, hits and treatment

### Not yet complete

0.0.9 is a **working First Contact vertical slice**, not a claim that ten large combat roadmap builds have all shipped. Directional body-region armor, explicit lean/crouch, advanced bounding and flanking, dragging and casualty extraction, multiple hostile factions and reinforcement schedules, world-scale territory persistence, a multi-site mission day, and a complete debrief are still future builds. The foundational behavior is deliberately small and modular so those systems can be added without rebuilding everything.

## Technical architecture

- `src/combat/contact-simulation.ts` — headless, deterministic perception, cover, projectiles, ammunition, wounds, suppression and treatment.
- `src/combat/contact-director.ts` — actual 3D patrol models, independent movement, tactical route choice, hit effects and coordinated Mica action.
- `src/actors/operator.ts` — shared procedural rigs for Rook, Mica and distinct patrol operators.
- `src/main.ts` — unified mission and combat controls; original repair, inspection and crew flows remain.
- `src/fieldwork/`, `src/systems/power-network.ts`, `src/world/` — existing connected Cedar Relay systems preserved.
- `tests/contact-simulation.test.mjs` — cover, perception, hearing, finite ammo, reload, injury and rescue tests.

Build locally with Node 22+:

```sh
npm install
npm run dev
npm test
npm run check
npm run build
```

GitHub Actions checks `main` and deploys the production build to Pages.

## Previous milestones

- 0.0.1–0.0.3 — miniature world, Rook locomotion, isometric camera and mobile controls
- 0.0.4 — physical relay service and procedural sound
- 0.0.5 — cooperating crew with physical spare parts
- 0.0.6 — conditional faults, manipulation and testing
- 0.0.7 — an interconnected electrical facility
- 0.0.8 — handheld meter, field notes and legible system observations
- **0.0.9 — First Contact: tactical combat in the same functioning worksite**
