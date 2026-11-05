# E5-D R2 preview release / mobile acceptance boundary

R2 is an **opt-in civilian preview**. New casualty transport and behavior are only
enabled when the developer preview is active; the normal default remains civilian-free.

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
