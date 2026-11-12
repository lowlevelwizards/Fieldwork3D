# Performance release checkpoint: P2.9–P2.11 (2026-11-12)

## Integration and release discipline

- Starting production baseline: P2.8, commit `557c55e7adbbf3f8f185cb64781ab8888ed810af`.
- Previous Pages workflow `43324544646` completed successfully, including
  the step verifying that the public site serves that exact stamped build.
- Feature PRs #1281, #1283 and #1284 remain separately committed. This
  integration branch combines their compatible, disjoint source changes so
  one squash merge will produce one production deployment.
- Do not merge until this *combined head* passes its critical checks and no
  other production Pages run is queued or in progress.
- After merge verify the new Pages job succeeded *including its public stamp
  verification step*, and that the deployment targets the merge SHA.
- If the deployment fails, fix the blocker; do not enqueue another release.

## P2.9 — Read-only attribution

Split the mobile UI/audio phase into camera, audio, HUD and action-ring
subtimings. Report the largest measured preceding-frame child and export all
four into the bounded CSV history. Nested child timings are not additive to
the parent. All additional timers remain behind `?perf=1`. No UI behavior,
audio output, gameplay or frame limit changes.

## P2.10 — Full-body route searches

1. Only during one synchronous route calculation, snapshot qualifying open
   door-leaf segments and apply a conservative expanded-AABB candidate
   filter before the exact segment-distance test. Recompute at the next
   route call, so hinge movement, cover updates and replay never see a
   persistent stale leaf.
2. If the full-size destination is physically invalid, return an empty
   normal recovery route before the redundant direct and twelve lateral
   A* attempts; every existing candidate route would reject that exact
   endpoint. No new path selections for valid destinations.

## P2.11 — Civilian sensing/motion

Share the exact old `civilianCondition` and 120ms response admission rule
with the motion-phase caller. On non-due 60Hz ticks, skip constructing
the observer's actor-specific sensory world, while still advancing the
physical civilian motor and all shared movement arbitration on every tick.
Reuse one fixed-tick world and clear/route/occupied callback per civilian
population; read actor positions at call time, not from stale snapshots.
Keep audio/visual evidence, civilian state changes, evacuation, and
per-person perception authority unchanged.

## Critical acceptance

- P2.9 preceding-frame UI hotspot, CSV parity and existing perf timeline.
- P2.10 independent legacy route oracle for active hinge, sliding, shutter,
  exact goal blocker plus P2.7 recovery and normal lane tests.
- P2.11 360-tick civilian cadence, injured/compliant behavior, shared
  motion, civilian contact and closeout tests.
- TypeScript, Vite production bundle, and combined standard PR gate.
- No claim of verified iPhone gains until a like-for-like seed/plan test
  measures live >=33ms / >=67ms intervals and hot motor/response/UI phases.
