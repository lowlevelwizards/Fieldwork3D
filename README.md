# Fieldwork 3D — 0.0.9: First Contact

**Live game:** https://lowlevelwizards.github.io/Fieldwork3D/

Fieldwork is a mobile-first, isometric, handcrafted Three.js/TypeScript world where small teams navigate, inspect, repair, protect, and survive in one continuous environment. 0.0.9 introduces the first **actual combat encounter at Cedar Relay** without replacing the existing operations or porting the legacy Fieldwork AI2 runtime.

## Playing First Contact

Two distinct armed patrol operators move near the eastern service road. They see along a real facing direction, remember last-known positions, and investigate shots they hear. They have finite ammunition, reload, take cover when wounded or suppressed, and may lose contact with the crew.

- **Tap an armed patrol operator** to select them as a target (a small ring marks the selection).
- **Tap ⌖** below the top-right scene information to raise/lower the tactical controls; this does not pause the world.
- **Hold FIRE** to fire repeated deliberate shots at the selected target. Gunfire is blocked by the **same real shed, trees and machine obstacles** used for movement. Hits and misses create momentary tracers/impacts.
- **↻** reloads a finite magazine (9 rounds, 36 spare). **◎** cycles between known opponents.
- **MICA · FOLLOW** cycles through FOLLOW, HOLD, COVER, WITHDRAW. The same physical operator who carries tools and repairs circuits also uses those orders under threat.
- **AID MICA** appears if Mica is incapacitated. Rook physically approaches and gives aid if there is no exposed enemy dangerously close. Once both hostiles are down, Mica can also assist an incapacitated Rook.
- **REGROUP · RETRY** appears after a resolved contact or if Rook is down. It resets the training encounter without losing the electrical incident.

The existing worksite remains functional during combat. Contact can interrupt diagnosis, a repair hold, or a supply run; the prior job obligation is not destroyed. Afterwards, return to the same investigation, isolate power and restore service. You can instead withdraw or leave unresolved work.

### Desktop keys

WASD / arrows move; F/Q/E focus/orbit; M sound; Space service action. New: **C** tactical mode, **J** fire while held, **G** reload, **X** next target, **V** cycle Mica tactical order.

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
