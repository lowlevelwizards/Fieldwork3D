# Fieldwork 3D — 0.0.8: The Operator's Eye

A mobile-first, isometric Three.js/TypeScript game about a small crew understanding and repairing a connected physical worksite.

**Live:** https://lowlevelwizards.github.io/Fieldwork3D/

## What's different

0.0.8 focuses on *seeing, testing and understanding* the systems introduced in 0.0.7 without adding another map or overwhelming the scene with UI.

- **Rook's handheld meter:** During an actual equipment inspection Rook draws a chunky pixel-display multimeter and brings a probe toward the physical connection. The small local readout comes from the electrical network, not a fake hint. Rook takes a moment to obtain the reading.
- **Better physical clues:** The generator has an operable starter and rotating fan, the switchgear's breaker changes position, an open feeder has a visibly discontinuous cable, and damaged junction terminals are scorched behind a hinged service cover.
- **A fold-out field notebook:** The small ▤ notebook icon sits unobtrusively beneath CEDAR RELAY. Open it to see only **measurements Rook or Mica actually made**, their source, a hypothesis based on observed evidence, the crew's current action, and recent events. No unexplored machine conditions appear here.
- **Legible autonomous behavior:** Mica briefly displays a localized activity cue when they begin fetching, delivering, isolating, reconnecting or returning. The notebook also records brief radio reports and observed actions.
- **Physical machine-to-machine work:** Tap a machine to walk to its service position. Tapping while nearby makes Rook use the meter; after diagnosis, hold the machine's local repair control to work. A small marker indicates the diagnosed worksite, not merely the powerless downstream relay.
- **More reliable approach and recovery:** A machine interaction can no longer silently end at an unreachable pathfinding cell. Work anchors use collision-checked approach positions; operators retain their existing causal obligations across movement and handoff interruptions.
- **Regression coverage:** All six network fault cases, secondary terminal trips, handoffs, supply isolation, power reconnection, deferred work and route approaches have explicit automated checks.

## Basic flow

1. Start at the truck. Mica independently checks the generator while you choose where to investigate.
2. Tap the generator, switchgear, relay cabinet, junction or mast to examine it. Rook walks over, stops, turns, produces a meter, makes contact and records the voltage.
3. Open the tiny notebook (▤) only if you need to review observations or what Mica reported.
4. Once someone locates the actual defective equipment, the worksite marker and a **GO TO...** control direct Rook to it.
5. Mica gets needed materials or isolates the supply. Inspect the physical equipment, then press and **hold** the contextual control to perform the action. Interrupting the hold does not finish the job by magic.
6. Mica reconnects the supply before an energized **TEST CIRCUIT**. If a damaged terminal reveals another trip, repeat isolation, repair and test.
7. Watch the site light up when power genuinely reaches the radio mast; the crew returns to the truck. **ANOTHER JOB** begins a fresh incident.

A job may still be intentionally **LEAVE FOR LATER** if it cannot be completed. The environment stays unpowered and the result is recorded.

## Controls

- **Tap a machine:** path to its physical working position; if already near, inspect/act
- **Press-and-hold local repair control:** manipulate parts (no timing minigame)
- **▤ notebook:** expand or close the optional field notebook
- **Two mobile thumbs:** lower-left move stick, lower-right rotate stick
- **Pinch / twist / upper-area drag:** zoom, rotate and pan the isometric view
- **WASD/arrows:** move on desktop; **F/Q/E:** focus/rotate; **M:** toggle sound

The quiet place/time/weather header remains. The meter and Mica's activity captions appear only while relevant.

## Architecture and test commands

- `src/systems/power-network.ts`: actual network continuity and fault propagation
- `src/fieldwork/network-job.ts`: observed diagnosis, guarded repairs, tests and outcomes
- `src/fieldwork/field-notebook.ts`: small, pure, provenance-tracked observational memory
- `src/actors/operator.ts`: character motion and procedural meter/physical tool handling
- `src/world/power-yard.ts`: working site props, disconnected cable, serviceable panel and physical state visuals
- `src/navigation/service-approach.ts`: collision-safe route and arrival checks
- `src/crew/crew-mission.ts`: Mica's supply and electrical-work obligations
- `tests/crew-network-operation.test.mjs`: six-incident end-to-end simulations
- `tests/service-approach.test.mjs`: physically achievable service-position routes

Node.js 22+:

```sh
npm install
npm run dev
npm test
npm run check
npm run build
```

GitHub Actions validates `main` and deploys the compiled Vite output to GitHub Pages. The project deliberately avoids loading the much larger legacy Fieldwork AI architecture until additional behavior is justified by actual gameplay.

## Milestones

- 0.0.1 — Cedar Relay miniature and locomotion
- 0.0.2 — Mobile movement and orbit
- 0.0.3 — Orthographic isometric camera and quiet interface
- 0.0.4 — Physical machine repair
- 0.0.5 — Autonomous two-person cooperation
- 0.0.6 — Different fault conditions and physical job sequences
- 0.0.7 — Real site-wide power connectivity
- **0.0.8 — Observable diagnosis, meter, evidence notebook, legible crew behavior and reliable interactions**
