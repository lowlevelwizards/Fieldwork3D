# D3.2 — Evidence-driven doorway correction
Base: `9eb200e4217d8dbdaf49d9905bacc88c852c88c6`. D3.1 5-site/1200-tick baseline: 4/10 entire four-operator plans and 29/40 completed operators, four door-opening holds and 58 door open/close state changes. The 11-site/900-tick corpus has different travel duration, and its incompletions are NOT 16 deadlocks.

## D3.2.0 complete
- Offline-generated evidence, not production motor instrumentation: door-opening entry/exit, milestones .75/1.5/3/6/12s; actor position, authored goal versus actual nav leg, active traversal episode, real leaf angle/velocity, actor and geometry sweep obstruction.
- Snapshot obstruction flags are evidence of instantaneous geometry, not a causal conclusion. Capture only the 3 nearest relevant leaves; cap each actor to 12 events.
- No runtime game-state mutation, additional simulation clocks, ongoing geometry probes or collision exemptions.
## Remaining
D3.2.1 actual door selection and intent handoff; D3.2.2 obstruction/recovery without ping-pong; D3.2.3 convoy; D3.2.4 hotpaths; D3.2.5 acceptance/release.
