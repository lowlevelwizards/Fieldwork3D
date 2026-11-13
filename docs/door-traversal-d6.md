# D6 — Generated-building acceptance and real-device door performance

## Completion scope
D6 is an acceptance and observability release over the **single existing** physical
door motor. No new collision solver, recovery heuristic, auto-teleport, gap shrink,
per-frame global door scan, or gameplay movement semantics are introduced.

### D6.1 — Full generated-building execution corpus
- Reuse the production 11-archetype R7 generated-site audit with two real
  four-operator plan modes: independent authored MOVEs and requested squad entry.
  Preflight denials count as denials, **not** failed crossings.
- Hard-fail corrupted authored node IDs, non-finite physical positions,
  mechanically impossible per-tick motion, and more than four D2 maneuver
  selections in one episode. Report door reversals, long stalls, near-door
  backing up, passage waits, and incompletions with seed, layout, and mode.
- Retain full four-operator deterministic four-hinge, furniture, lock, wedge,
  grip and replay acceptance in the dedicated D0–D5 suites.
- Never declare an obstructed hinge passable simply to make a seed green.

### D6.2 — Mobile Door Test Range instrumentation
- Opt-in 60-second rolling 250-ms peak buckets record actual RAF arrival gaps,
  simulation callback wall time, 2D drawing callback wall time, and fixed ticks.
  Count >=33.3-ms and >=67-ms RAF delays; label >=1000-ms background suspensions.
- Include recent history in the existing **COPY REPORT** artifact. Capture and
  graph metrics only while explicitly enabled; normal game physics stays untouched.
- Render one 2D frame per browser animation callback after its fixed-tick
  simulation work instead of redrawing once per 60-Hz substep. Paused/manual
  controls still redraw synchronously. This prevents high-speed range playback
  from misleadingly multiplying browser canvas work.
- **Do not** label RAF gaps as GPU processing, or infer an iPhone FPS improvement
  from CI, Node execution, or generated buildings.

### D6.3 — Live-game and handset comparison protocol
- Existing full-game ?perf=1 diagnostics retain the real gameplay 60-second
  RAF/JS/simulation/3D sync breakdown; D6 does not duplicate them.
- Verify on the same physical handset and display setting: idle planning,
  sustained live four-person door passage, opposing traffic and 3D replay.
  Compare 60-second traces for spike count, RAF worst, simulation and rendering
  slices, plus actual completion and queue correctness.
- Keep OS/background scheduling, UI/canvas costs and actual simulation costs
  separate. No GPU execution timer is claimed.
- Real device measurements require the user to run the deployed build on their
  phone; GitHub Actions cannot substitute simulated device statistics.

### D6.4 — Release gate
- Pure bounded profiler unit tests; static browser wiring of opt-in capture
  and one-paint-per-RAF behavior.
- Full generated 11-building R7 deterministic audit and door D0–D5 critical
  acceptance, production typecheck and Vite bundle.
- Commit stages to feature branch; merge only when all critical checks pass,
  the previous D5 Pages job succeeded, and no other deployment is queued.
  Verify the actual public build before describing D6 as deployed.

## Interpretation
D6 source code and deterministic CI can be complete independently of handset
measurement. The latter is explicitly a physical acceptance task: **do not
invent measured mobile performance or mark device-signoff green from CI**.
