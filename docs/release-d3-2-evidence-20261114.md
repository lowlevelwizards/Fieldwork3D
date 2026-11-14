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

## D3.2.1 quality disposition: REVERTED after same-seed comparison
A proposed purely leaf-receding handoff preserved strict physics and 58 door flips, but did **not change** 5-site/1200-tick completion (4/10 and 29/40) or the four opening holds. No benefit justified carrying another motor branch. Restore the pre-D3.2.1 motor tree and remove the unused test helper. No net production-motor behavior change.

## D3.2.2 — identify the *actual* opening obstruction before correcting it
Offline witnesses now identify individual blocking operators, their authored order and paused state, plus distinguish static architecture from other bodies. Also report whether the active nav waypoint is fully physically swept-clear and its clearance from the chosen leaf. This separates an operator obstructing *its own* door from another operator standing under the hinge or a site-generation obstacle. Avoid generic time-triggered handoff, blind re-route, involuntary displacement of stationary units, or door close/open ping-pong.

## D3.2.3 — candidate: physically clear short leg while hinge is body-blocked
R7.1 forensic witness confirmed D8 at 65.4% open was not blocked by architecture. Rook and Moss were the physical swing blockers while Ash/Vale waited. Vale's CURRENT nav leg from (348.72,414.37) to (352,416) is fully swept-clear in world-truth geometry; the final authored goal is across the door and must **not** veto that immediately legal short leg. Ash's distant nav leg is NOT swept-clear and stays on the existing blocked path.
The motor may permit only a short (<=22 world units), completely world-swept-clear CURRENT nav leg after an open hinge has stopped for >=.85s at >.32 and <.72 fraction. The same motor owns all motion; no hinge override. To eliminate the generic handoff regression that produced 277 state flips in D3.1, only an incidental BODY CLOSE on that very door is deferred for that one step via existing pressure policy; genuine physical OPEN, other leaves, and explicit CLOSE remain unchanged.
**Acceptance:** five-site/1200-tick full plan completion vs 4/10, individual completions vs 29/40; door-state flips vs 58 and hard stop >90; 11-site/900-tick smoke, four-operator inward/outward fixtures, typecheck, and pressure-policy regression. Revert unless the benefit exceeds its extra policy path cost.

## D3.2.3 quality disposition: REVERTED after same-seed test
The proposed short physically swept-clear leg handoff plus per-leaf CLOSE protection passed D5 and exact-workload checks but **again made no measurable difference** in the five-site/1200-tick audit: 4/10 squads, 29/40 operators, 4 opening holds, 58 door flips. It is not justified; all gameplay-changing files and its test have been restored.
A concrete blind spot explains why further speculative gates are not justified: earlier offline reports only showed the nearest physical door, **not the selected auto-open door** which the motor actually blocks on.
## D3.2.4 — exact selected-door witness
A minimal opt-in WeakMap records the ID of the door actually selected by `handleMotorDoor` on each opening-pause tick. The offline generated-site audit enables this witness while executing and disables it in `finally`; a snapshot reports the exact current-tick selected ID alongside previously recorded nearby leaf/body/static facts. The normal game has no new sweep, time owner, actor state, position edit, or continuous sampling.
