# P2.8 — rolling simulation-performance batch (November 12, 2026)

## Device evidence and limits

The latest iPhone 60-second capture reported 735 live RAF callbacks, 265 >=33ms,
33 >=67ms, maximum 184ms. The worst preceding JS callback measured 169ms,
including 114ms of simulation and a 100ms Vale motor-collision slice. Another
operator's orders measured 69ms. A separate UI/audio slice measured 90ms,
and CPU WebGL submission measured up to 43ms; these are distinct bottlenecks.
The previous 317ms civilian-motion and 197ms collision events motivated the
P2.7 work already integrated into main. No new FPS claim follows from this
code-only optimization; compare the same device, map, seed and execution plans.

## Stage commits

- P2.8a: Conservative radius-expanded swept AABB eliminates impossible door
  collision candidates for ordinary full-body motor sweeps.
- P2.8b: Do the same for the three-point narrow torso, including its exact
  3.25 world-unit shoulder offset. Reuse invariant start samples and final
  overlap tolerance.
- P2.8c: If full-body motion is legal and the operator is not currently
  squeezing, the squeeze gate cannot be entered. Avoid the redundant narrow
  clearance sweep on those normal walking steps.
- P2.8d: The session's existing revision-invalidated cover index replaces
  full cover-array scans at each exact LOS sample in the world-context ray
  adapter. The same true furniture overlap and fence exemptions decide.
- P2.8e: Calculate each nearby dynamic leaf segment once per synchronous
  sweep; use exact point-to-segment checks at every original movement sample.
  No cached leaf survives a hinge tick, playback seek or door mutation.
- P2.8f: Add opt-in breakdown inside motor-collision for normal-lane search,
  wall glide and world-truth route replan. These are nested measured durations
  within the existing motor-collision parent and must not be summed with it.

## Safety contract

No authority changes: keep the fixed 60Hz simulation tick, real door hinge
movement and collision, actor radii, start-of-leaf-overlap escape rules, full
normal-versus-narrow priority, watch facing, player-authored plan nodes,
moving civilian response, personal sight and fog disclosure. All broadphase
decisions are conservative; exact physical tests still run on candidates.
Static cover index validity depends on the existing authoritative revision
increment and replay invalidation, not an additional independent cache.

## Critical verification

The P2.8 CI gate executes independently frozen P2.7 sweep and LOS oracles:
320 dynamic-hinge/multi-radius body/squeeze cases, 840 line samples for each
cover layout before and after a cover revision, prior normal-lane and
movement-doorway checks, opt-in simulation-probe parity, TypeScript and Vite.
An unrelated legacy source-location assertion in the old doorway test still
looks for window rendering code in breach-3d.ts after a prior rendering
extraction. The P2.8 gate exercises the relevant physical doorway tests by
name, not the stale window-file assertion.

## Follow-up instrumentation

Capture from a new Pages-served build only after the previous release and
this branch's critical gates pass. Compare live/idle >=33ms, >=67ms, prior
operator motor-collision, the three new nested collision sections, civilian
response/step/authority, WebGL CPU submit, UI/audio and perceived movement.
Treat between-callback waits and GPU execution as unconfirmed until measured.
Keep the branch open if the exact next production deployment is queued.
