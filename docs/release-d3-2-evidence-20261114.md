# D3.2 — Evidence-driven doorway correction
Base: `9eb200e4217d8dbdaf49d9905bacc88c852c88c6`. D3.1 5-site/1200-tick baseline: 4/10 entire four-operator plans and 29/40 completed operators, four door-opening holds and 58 door open/close state changes. The 11-site/900-tick corpus has different travel duration, and its incompletions are NOT 16 deadlocks.

## D3.2.0 complete
- Offline-generated evidence, not production motor instrumentation: door-opening entry/exit, milestones .75/1.5/3/6/12s; actor position, authored goal versus actual nav leg, active traversal episode, real leaf angle/velocity, actor and geometry sweep obstruction.
- Snapshot obstruction flags are evidence of instantaneous geometry, not a causal conclusion. Capture only the 3 nearest relevant leaves; cap each actor to 12 events.
- No runtime game-state mutation, additional simulation clocks, ongoing geometry probes or collision exemptions.
## Remaining
D3.2.1 actual door selection and intent handoff; D3.2.2 obstruction/recovery without ping-pong; D3.2.3 convoy; D3.2.4 hotpaths; D3.2.5 acceptance/release.

## D3.2.1 — narrow physical clearing handoff (candidate)
D3.2.0 11-site real-motor trace: seed 31058 townhouse authored operators ash and vale stalled at D8 (openFraction .654, angularVelocity 0) for >=6s; seed 31175 clinic operator vale likewise stalled at D6 (fraction .572). Their move's authored target and current transient nav leg differ, the door can no longer rotate due to body geometry, and a paused motor cannot take even an otherwise legal separating step. `blockedTime` stays zero.
A bounded gate in `handleMotorDoor` lets the *existing* current physical step continue only if it and its nav target increase distance from the same leaf, the leaf has genuinely stopped, and the actual short step does not cross the panel. It never moves the actor itself, opens/closes a hinge, makes a new route, overrides body sweeps or bypasses a real locked/held door. The ordinary door-pressure scan sees a receding step, so it cannot generate a closing impact on that leaf.
**Quality gate:** re-run seeded 5-site/1200-tick completion and doorStateFlips (baseline 58, hard ceiling 90). Revert if oscillation returns or no meaningful movement benefit appears.
