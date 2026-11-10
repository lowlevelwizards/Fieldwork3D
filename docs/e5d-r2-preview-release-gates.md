# E5-D R2 preview release / mobile acceptance boundary

R2 was originally an **opt-in civilian preview**. As of the November 8 live
field-test activation, standard Quick Play and Campaign opt in by default;
`?civilians=0` remains the rollback switch. Legacy sessions and old replays
may still be civilian-free. This document's R2 device gates remain applicable.

Automated release gates:
- Focused R2 transport, replay, collisions, navigation and animation tests.
- Fixed-seed 0/2/4/6-population simulation/replay matrix.
- Legacy rescue marker compatibility.
- TypeScript and production Vite build.
- Operator motion, animation and CPU simulation performance workflows.
- Confirm prior Pages is complete and serves the expected stamped build.
- Inspect the new Pages verification log for the released commit.

Still required for R3 default activation (not supplied by headless CI):
- Safari/iOS real-device FPS and sustained session thermals.
- Touch hit-targets with civilian near doors/objects.
- 3D fog and replay visibility screens in live hardware conditions.
- Six-civilian combat stress screenshot and physical escort/carry usability.
Do not present host CPU probes as measured phone performance.
