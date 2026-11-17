# E6.19 — exact transparent main-pass draw reasons

E6.18's two fixed-seed 90-frame A/B showed only 1/6 fewer p95
draw calls from owner-scoped opaque static merging. E6.18's bounded
source-family diagnostics highlighted approximately 27,286/27,566
sampled draws from generic environment/BoxGeometry/
MeshStandardMaterial/transparent. Those are observed family totals
over 90 frames, not a definitive full transparent census.

## Implemented in E6.19
- Add an **exhaustive** reason-classifier for actual
  non-shadow `renderBufferDirect` submissions where the currently
  bound material has `transparent=true`. Only the existing opt-in
  `?coldBench=1` profiler observes this.
- Prefer nearest explicit `fieldworkTransparencyRole` on visual
  mesh or its ancestor, defaulting to honest `unclassified`.
- Label wall bodies by live camera-cutaway or known-exterior-facade
  status; wall skirting/cap/body source families; wall weathering;
  floor overlays; roof; signage/restored facade; wear; windows/door
  glass. Tags never control visibility or material state.
- Each capture reports the complete per-frame role list, checks
  its total EXACTLY equals actual transparent draw calls, and
  aggregates role totals and the proportion classified over
  the bounded real 90-frame live execution.
- No renderer pass, geometry combination, polygon sorting,
  fog-of-war, cutaway opacity, shadow resolution or replay changes.

## Release gates
Focused tests for nearest-role attribution, shadow exclusion,
opaque exclusion, reset semantics, per-frame exhaustive counts,
old E6.18 draw-source compatibility, and site visual policy.
TypeScript/Vite build; fixed Quick Play seeds 23/97, real mobile
Chromium/SwiftShader, 90 executing frames each with briefing
hold, zero runtime errors, 85+ exact shadow/main and transparent-role
reconciliation frames. Previous E6.17/E6.18 workflows also exercise
the changed source.
Before any integration verify latest main production Pages exact SHA
and no overlapping deploy.

## Next optimization decision
Compare named transparent roles before touching batching.
Camera-faded walls, known-exterior facades and translucent weathering
have different layering/visual contracts. Do NOT turn material
transparent=false, merge independently ordered faces or reduce
fog compositing merely to lower measured counters. Start E6.20 on
the largest optically safe subgroup only with screenshot parity.
No uninstrumented FPS claim.
