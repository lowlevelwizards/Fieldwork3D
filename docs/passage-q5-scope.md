# Q5 — Formation-sensitive door entry, deterministic speed and reliability

## Scope and safety contract
- Q5.1: six distinct four-person approach geometries: perpendicular/center, stack-left, stack-right, split 2+2, 45-degree left, 45-degree right, plus mirrored entry from both faces. Positions are lab fixtures, not a modification of player-authored stacking behavior.
- Q5.2: physical success/failure matrix across the known 10 door fixtures (two hinges and swings, pre-opened/ajar, furniture, locked, wedged), 2 faces and 6 formations. Provide separate squad and independent-MOVE audits. Preserve a reproducible seed, full per-operator position and blocked reasons, time to last BODY crossing, and time to all authored orders finished.
- Q5.3: optimize actual measured passage. The primary score is time to 4 full-body clearances, with completion time a distinct score. Never lower OPERATOR_RADIUS, skip collision sweeps, teleport actors, auto-clear a locked door, rewrite user LOOK/WATCH, or require timed holds where clearance is available.
- Q5.4: expand generated-map stress with selected deterministic seeds; keep detailed failed trials reproducible, zero backward drift while held and finite corrective attempts. Mobile FPS must be observed on real device; Node CPU is not a GPU metric.
- Locked, wedged and permanently blocked swing: correct rejection/blockage constitutes a passing physical-safety case. Unobstructed four-person entries must achieve 4/4 crossings and plan completion inside defined timeout across the chosen fixed corpus. An observed failure remains red: no fabricated 100% claim.

## Testing and workflow
- Fast staged feature commits. CI matrix emits JSON failures + per-formation times (median, p90, worst). Start with original four door cases × six formations × two faces and expand after benchmark is stable.
- Continuous order-authority, Q0–Q4, D0–D6, performance and generated-site gates; avoid the false claim that every arbitrary procedural world is guaranteed solvable.
- Merge only with a green fixed corpus; first check prior Pages deployment, then deploy once and verify expected public build.
