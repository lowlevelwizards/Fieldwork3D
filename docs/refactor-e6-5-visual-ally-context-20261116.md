# E6.5 — single-pass visual teammate context

**Baseline:** `eb9f6bc22b2cd9007689e35a57606e25b3b99948` (E6.4 and subsequent Arsenal docs fully deployed).
**Branch:** `refactor/e6-5-single-pass-ally-context-20261116`.

## Source-level bottleneck and decision

E6.4 added interval pose preparation/appearance, fog Canvas2D, and renderer-confirmed upload submission attribution. **No real-device capture is in this batch**, so declaring appearance serialization, pose solver, or fog uploads the dominant GPU/RAF bottleneck would be unsupported. The next safe, demonstrable redundant CPU work is the **second teammate roster traversal** per visible posed operator, located inside `TacticalScene3D.update`.

Formerly, visual weapon clearance and stacking walked every peer, after which `teammateAheadForHandling(actor.p, actor.heading, s.operators, actor)` walked the same roster again, with the same self/team/health filters. On a 16-member roster this can be up to 240 unnecessary additional peer visits per frame (for 16 eligible posed operators; actual contact, visibility and early exits vary). The shot-time firing/aim collision rules are separate and remain unchanged.

## Implemented scope

1. Extract the **exact existing** projected teammate predicate into `teammateAheadProjectedOffset(dx,dy,fx,fy)`, preserving `forward>=4 && forward<48 && across<8.5`. Keep the public `teammateAheadForHandling` API for the physicality lab and other callers, using the same predicate.
2. Fuse directional courtesy into the existing `s.operators` safety/stack scan inside the scene. Reuse fixed-tick positions for 40u stack and directional high-ready, interpolated rendering x/z for the 90u safety list. Always visit the entire roster for safety even once a friendly is ahead; preserve teammate side, health, self, and ordering. Continue using `safetyBodyFor` for every eligible near teammate; no new allocation, caching of peer state or simulation update.
3. Under the **existing opt-in PERF** instrumentation, measure `allyContextMs` and record `allyPeerVisits` per 3D update. Include both in the existing 750ms aggregate; do not time in normal gameplay, and do not bill skipped 3D frames.
4. Add randomized mixed-roster, angular-boundary, and static regression tests comparing the previous two scans to the fused one. Cover live plus downed teammates, enemy exclusion, exact threshold behaviors, changed rendered positions, and no fog/first-contact changes.
5. Record a repeatable `scripts/verification/e6-5-ally-scan-bench.mjs` CPU A/B on 4/8/16/32-actor synthetic rosters. CI gates **behavioral parity and removed peer visits only**, not milliseconds. Timings are environment-sensitive and do not demonstrate iPhone FPS, mobile energy, WebGL GPU, or encounter smoothness.

## Deliberate exclusions

- Do not change `assessFireLane`, weapon clearance volumes, collision, cover, door contact, operator rig poses, reload, replay chronology, enemy disclosure or FOW logic.
- Do not throttle pose calls, defer first contact or lower fog texture resolution.
- Do not assume appearance fingerprint or fog upload is a significant runtime bottleneck without same-device PERF evidence.
- FPS/RAF claims require comparable in-browser recordings with matching seed/device, phase and viewing configuration.

## Acceptance and release

- Run E6.5 parity and Node observational A/B, the E6.0–E6.4 contact/pose/fog tests, architecture suite, animation regression and production typecheck/build on the **final PR head**.
- Verify previous main Pages workflow success and exact public Pages SHA before merging; do not overlap a production deployment.
- Merge in one logical release checkpoint, then ensure the next Pages workflow and its exact-build public verification succeed.
