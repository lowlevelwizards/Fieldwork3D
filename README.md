# Fieldwork 3D

**0.0.6 — Things Go Wrong**

A tiny Three.js / TypeScript isometric world where a persistent two-person service crew has to **observe a physical problem, make a diagnosis, obtain the right help, manipulate the equipment, and test the result**. The original [Fieldwork](https://github.com/lowlevelwizards/fieldwork) remains a reference archive rather than a dependency.

## Play

https://lowlevelwizards.github.io/Fieldwork3D/

Cedar Relay begins beside the equipment truck. Tap the electrical cabinet near the shed and use the context controls **only at the cabinet**.

There are now three genuinely different service cases, cycling across jobs:

| Fault (discovered through inspection) | Mica's task | Rook's physical work | What testing can uncover |
| --- | --- | --- | --- |
| Blown fuse | Retrieve and deliver the spare | Hold the local control to install it | Relay powers up after testing |
| Loose terminal | Retrieve and deliver terminal hardware | Hold to secure the connection | Poorly oxidized contacts arc and trip on the first test |
| Jammed contactor | Walk to the truck-side disconnect and isolate supply | Hold to free the jammed contactor | Safe re-energization after inspection |

After opening the cabinet, use **INSPECT** to discover the issue. The crew doesn't assume a diagnosis in advance. Mica autonomously takes the assignment appropriate to the discovered fault, using the existing navigation and physical work anchors.

When hardware is available or isolation is confirmed, the in-world action changes into a **HOLD TO...** control. Keep your thumb on it until the work is physically completed. Pausing the hold preserves most of your progress; departing from the enclosure interrupts the task. There are no reaction-time minigames.

After work on an isolated circuit, Mica must return to the truck disconnect and **reconnect power** before **TEST CIRCUIT** becomes available. Testing then follows the actual power state. Some corroded terminal conditions produce a real follow-on fault: the connection arcs, the protective system trips, and Mica returns to isolate the feed so Rook can reseat the damaged connection; Mica then reconnects supply before the second test. The surprise derives from recorded mechanical condition in the selected incident, not an arbitrary combat event or render-frame random number.

The crew may also **LEAVE FOR LATER**, returning to the truck with the relay left offline. Power restoration, unresolved condition, consumed supplies, beacon color, work sounds, and repair history are all grounded in the outcome. A completed or deferred call ends when *both* operators return to the truck. Use **ANOTHER JOB** to advance to the next case without refreshing.

The next incident index and aggregate restored/deferred counts are saved locally. An incomplete call can be retried without overwriting the history.

## Controls

| Input | Action |
| --- | --- |
| Tap/click ground | Move Rook with collision-aware navigation |
| Tap/click cabinet | Approach, open or inspect |
| Contextual service control | Hold to manipulate equipment / tap to test |
| Leave for Later (at cabinet) | Defer the fault and return crew |
| Lower-left drag (touch) | Floating movement stick |
| Lower-right drag (touch) | Floating yaw/orbit stick |
| Two-finger pinch/twist | Zoom/orbit |
| Drag open scene | Pan |
| Tap truck | Return / new job when applicable |
| WASD / arrows | Direct movement on desktop |
| F, Q, E | Focus/rotate |
| Space (desktop) | Context action (hold during repair) |
| M | Mute/unmute procedural audio |

The HUD remains only the location, in-world time and weather. Other prompts appear only at physical interaction locations or as brief feedback.

## Architecture

- `src/fieldwork/field-incident.ts` — deterministic diagnosis, equipment wear, distinct fault procedures, hold progress, fault-derived test trip and two outcomes.
- `src/fieldwork/relay-site.ts` — distinct low-poly terminal, cable, fuse, contactor, indicator and intermittent spark effects.
- `src/crew/crew-mission.ts` — durable delivery/isolation/return obligations; component ownership and power-isolation gating.
- `src/crew/companion-controller.ts` — Mica's independent physical navigation and cooperation.
- `src/crew/truck-depot.ts` — supply compartment, tangible delivered component and a visual electrical disconnect.
- `src/actors/operator.ts` — articulated crew with locomotion, crouching, tool, handoff and idle behavior.
- `src/input/` — twin touch controls and fixed-elevation orthographic camera.
- `src/audio/` — restrained Web Audio feedback, footsteps, radio calls and faults.
- `tests/` — fast pure simulation tests, incident/crew integration, repair gating and route reachability.

## Build and deployment

Requires Node.js 22+.

```sh
npm install
npm run dev
npm test
npm run check
npm run build
```

GitHub Actions validates pushes to `main` and deploys the Vite production output to GitHub Pages. No AI2 runtime has been copied into the fresh game.

## Milestones

- 0.0.1 — Cedar Relay diorama, operator and navigation
- 0.0.2 — Responsive floating joysticks and better locomotion
- 0.0.3 — Quiet HUD and true isometric orthographic camera
- 0.0.4 — Tangible relay cabinet service
- 0.0.5 — Two people retrieving and transferring a physical spare
- **0.0.6 — Variable faults, actual diagnosis, independent crew roles, interactive manipulation, conditional complications, visible persistent outcomes**

Further work should deepen systems only in response to an observable gameplay opportunity, not rebuild an enormous invisible AI stack.
