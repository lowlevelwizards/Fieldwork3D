# Release D0 — tactical performance baseline, targeted hotpaths and CI guard

Base: `6b3715a0e9b25017e9aeca26ba0ddcc64c7aa764`. D0 is a **performance observability and low-risk maintenance release**. It is not a new tactical engine, AI behavior change, GPU pipeline, or simulation-clock redesign.

## Current code audit
- `breach-runtime-loop.ts`: 60Hz fixed-step authority; at most three sim ticks per RAF with bounded catch-up. UI/3D and replay use separate clocks; ordinary in-match PERF is user-armed, with always-on coarse 250ms bucket RAF history. Do not throttle live actors or disable required replay 60Hz footstep event collection.
- `breach-performance-timeline.ts`, `breach-perf.ts`: 60s history, replay/live/idle attribution, CPU slices, draw/triangle counts (not GPU milliseconds), 750ms UI update. Existing opt-in metrics are sufficient; no continuously sampled per-actor overhead.
- `breach-simulation-motion-phase.ts`: repeated session geometry lookups and sequential `.find` scans for actor/civilian IDs during fixed-tick authority and carrying resolution; short-lived `.filter().map()` arrays for every transport check. Preserve exact collision order and authority.
- `breach-movement-authority.ts`: deterministic sorted hard-body pairs, AABB early reject and exact continuous segment check. Optimize only conservative early checks, never weaken near-pair collision.
- `breach-replay.ts`: 60Hz ordered event/motion journal plus 20Hz film samples; do not skip 60Hz capture to inflate benchmark results. Actor identity/session lifecycle and replay scene use separate owners.
- `scripts/bench-breach-performance.mjs`: existing host-side simulation, AI/firefight, visibility and civ benchmark, but no machine-readable multi-phase regression comparator or explicit workload/fingerprint gate.
- Rendering includes idle coarse-pointer 30Hz 3D presentation option with immediate interaction grace; never throttle simulation, camera/gesture input, 2D UI, or replay playback.

## Implementation scopes
**D0.1 — Fixed-tick hotpath consolidation.** Reduce repeat actor/civilian ID lookups and repeated geometry access while preserving exact ordered movement proposals, body collision outcomes, transport rollback, and all step/rescue mission semantics. Consolidate carried body selection and avoid empty per-tick map/filter/sort where possible. No new game-state fields or independent update clocks.

**D0.2 — Deterministic workload measurement.** Add reproducible, machine-readable Node workload corpus across planning/site setup, quiet simulation, running/replay recording, active combat/contact, populated civilian movement and replay seeks. Include count/fingerprint measures (event, shot, final position/objective) to distinguish faster behavior from skipped work. Separate host CPU/heap estimates from device FPS/GPU timing, and report p50/p95/p99/max of per-tick cost. Do not falsely claim these workloads are automatic full mission completion.

**D0.3 — Targeted regression/parity CI.** Compare exact gameplay signatures against `6b3715a0e9b25017e9aeca26ba0ddcc64c7aa764` under equivalent scripted inputs. Run existing motion/AI/visibility/replay/door and performance tests; gate map/mission quality at existing thresholds; require TS/Vite production build. Host CPU timing is advisory (variance), not an unreliable pass/fail gate.

**D0.4 — Release checkpoint.** Stage commits, green exact-head CI, previous Pages verified, no queued deployment, merge once and verify new public Pages SHA. Report algorithmic savings versus measurable on-device impact honestly.

## Player-side acceptance protocol
Use the existing in-match PERF overlay to capture 60 seconds each in idle planning, four-operator movement and door entries, active firefight/contact, civilians, and replay. Compare device, resolution, thermal/battery/Low Power Mode and full-history CSV. Check RAF 33/67ms rates, culprit CPU/scene phase, draw calls, memory growth and input latency. The remote Node runner is **not** an iPhone simulator, so actual iOS GPU/memory/thermal numbers are not asserted by CI.

## Repeatable diagnostic commands
- Normal exact-reference CPU suite: `node --experimental-strip-types scripts/audit-release-d0-workloads.mjs d0-output.json`.
- **Optional sustained CPU/heap survey:** `node --experimental-strip-types scripts/audit-release-d0-workloads.mjs d0-sustained.json --sustained`. Runs 7,200 requested fixed ticks (120 simulated seconds) each for quiet, contact and civilian workloads, unless the game phase terminates legitimately. It records sampled heap estimates once every 60 fixed ticks; a single Node heap delta is **not** a validated memory leak.
- Compare identical code-input corpus before/after: `node scripts/compare-release-d0-workloads.mjs d0-before.json d0-after.json d0-parity.json`.

## Human/device release acceptance checklist
For a real phone, open the existing **PERF** overlay in a normal in-match URL. With low-power mode disabled, stable brightness, identical site/seed, same 3D view, and a consistent thermal/battery state, collect and export at least 60s each of idle planning, four-operator path/doorway entry, active contact, civilian activity, and replay playback. Repeat after 3–5 minutes on the same device to look for worsening p95/67ms RAF gaps, increasing GPU draw counts or memory pressure. Note device model, browser, FPS display refresh rate, whether the phone is throttled and whether the stage is in two-monitor desktop or mobile mode. Existing RAF timing includes OS background stalls; distinguish those from simulation/renderer work using previous-frame CPU attribution. The repository CI cannot impersonate a user's actual iPhone GPU; claiming on-device FPS improvement without that capture is out of scope.
