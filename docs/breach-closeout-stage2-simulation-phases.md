# Fieldwork Breach — Closeout Stage 2: simulation-phase ownership

## Completion contract

The fixed `stepSession(s,dt)` remains the **only live-game** entry point.
`breach-runtime-loop.ts` schedules 60 Hz ticks. Phase ordering is now
specified once in `advanceSimulationTick` and its typed
`SimulationPhasePort` in `breach-simulation-phases.ts`.

No changes to combat balance, movement, hit resolution, animation, AI
knowledge, civilian behavior, mission policy, deterministic RNG, history
sampling or replay format are permitted in this architectural closeout.
The four SHA-256 Stage 1 gameplay outcomes remain frozen and **must not
be regenerated merely to turn CI green**.

## Before / after authority

| Area | Previously | Now |
| --- | --- | --- |
| Simulation scheduling | `breach-runtime-loop.ts`, fixed-step RAF budget | Unchanged, still only calls `stepSession(state,1/60)` |
| Clock clamp and entry | `breach-game.ts` | Unchanged at `stepSession`; clock increment in single phase director |
| Phase ordering | 280+ line `stepSession` interleaving mechanics and marks | `breach-simulation-phases.ts` single ordered sequence |
| Medical and door leaves | Inline in `stepSession` | `breach-simulation-medical-door-phase.ts` |
| Contact-belief expiration | Inline in `stepSession` | `breach-simulation-belief-phase.ts` |
| Squad order, AI, morale | Inline in `stepSession` | `breach-simulation-actor-phase.ts` via typed `ActorSimulationPhasePort`, existing order/AI executors |
| Civilian/actor motion, hard-body resolution | Inline in `stepSession` | `breach-simulation-motion-phase.ts` via typed `MotionSimulationPhasePort` and Session geometry |
| Effect aging and flashbangs | Inline | Consecutive ordered callbacks; transient aging stays in phase module |
| Reports, observed intel, fire, mission | Inline | Explicit consecutive phase slots |
| Execution status evidence | Tail of `stepSession` | Last step of the phase director, after mission |
| Replay capture/seek | Runtime after each completed tick, separately for playback | Unchanged |

## Exact fixed-tick sequence

1. Increment simulation clock once using the original clamped `h`
2. Medical deterioration and held/opening door leaves
3. Transient effects, then flashbangs
4. Advance visual sight-acquisition progress
5. Age and disprove per-actor contact beliefs
6. Capture immutable pre-motor actor/civilian origins
7. Run operator loop (player orders, enemy AI, stance/morale/fire cooldown)
8. Couple carried bodies, step civilian intentions, arbitrate motion and stride
9. Resolve close-contact reactions
10. Distribute enemy reports
11. Observe live intel and line of sight
12. Resolve real shots and combat events
13. Evaluate mission completion/failure
14. Record changed player-visible execution status events
15. Return to runtime; recorder may then snapshot the completed tick

The sequence is **not interchangeable**. For instance:
- Contact reports are delivered before observation, but observations happen
  before firing; shifting those stages changes who may shoot on a given tick
- Door collision/yield precedes the actor origin snapshot; resolving doors
  afterward changes the physical state seen by orders and AI
- Execution-status events use the post-mission time and post-combat actor
  state; replay capture only sees a completed tick
- A pause or replay frame must never trigger the phase director

Actor policy and physical movement now live in dedicated phase modules. The
`breach-game.ts` facade retains only typed service adapters to existing AI,
order execution, cached routefinding and LOS functions; it does not contain
another per-tick phase sequence.

The existing opt-in performance marks retain their historical names:
`doors`, `aging-effects`, `visual-awareness`, `belief-aging`,
per-operator measurements, `actor-loop`, `civilian-motion`, `contacts`,
`reports`, `observe-intel`, `fire`, `mission`.
The post-mission event drain remains outside performance-mark allocation.

## Protected boundaries

- `SimulationPhasePort` has explicit typed functions; it carries no DOM,
  Three.js, replay editor, recorder, RAF timestamp or camera objects.
- Each `Session` owns actors, perception, geometry, RNG and event counters.
  The director has no retained cross-session mutable state.
- The phase director runs only synchronously in `stepSession`; no asynchronous
  or background simulation and no new scheduler.
- Route/door/cover/fire/AI algorithms are unchanged. This refactor extracts
  orchestration; domain modules still own their established physics.
- `stepSession` continues to accept the existing `dt` clamp and optional
  timing probe. A missing timing probe cannot change outcomes or allocate
  new event data.

## Acceptance and release

The Stage 2 architecture CI gate must pass:
- New phase-order, origin-boundary, single clock, paused-state, optional
  instrumentation and recorded-event checks
- Unchanged frozen Stage 1 door, medical, combat and civilian hashes
- Real WAIT, AI, projectile, mission, and replay parity tests
- Session-world and interleaved-session isolation
- Architecture ownership dependency check, TypeScript, production bundle,
  simulation-performance probe, previous Pages served-build checkpoint

A merge is not deployment. The Pages workflow must succeed through its final
`Verify public Pages serves expected build` step before Stage 2 can be called
fully released.
