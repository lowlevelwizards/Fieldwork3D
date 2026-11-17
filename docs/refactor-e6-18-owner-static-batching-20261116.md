# E6.18 — Conservative owner-scoped static draw consolidation

E6.17 proved the real non-shadow main pass is the main CPU/driver
render cost. Four 90-frame captures attributed approximately 1,082
draws (seed 23) and 1,237 draws (seed 97), mostly environment and
operators. Shadows were roughly 157–182 additional draws. E6.18
focuses on high-confidence **existing environment-only** subtrees.

## Implemented E6.18.A
After existing cross-owner static instancing, merge leftover opaque
MeshStandardMaterial meshes ONLY within an observed decorative object's
own root or an individual fixed door frame. Never cross distinct
visibility owners. Exclude exact interactive door threshold/wedge
references. Preserve original material identity, cast/receive shadows,
render order, layers, frustum settings, local vertex transform and
owner-level visibility. Skip children, userData-backed meshes,
transparency, unsupported/mixed geometry and independent animation.

Merged output has identical local-space vertex data and UVs. Newly
allocated merged geometries are owned/disposed by existing site graph
lifecycle; shared source geometry stays reusable. No simulation,
shadow fidelity, fog disclosure, visual material, dynamic door or
operator changes. Toggle `?e618Batch=0` is for diagnostic ON/OFF
comparison only; default enabled.

## Acceptance
- New unit tests assert exact world bounding boxes, independent room
  hide, functional door threshold/wedge identity, translucent surface
  exclusion, material/metadata boundaries and build ordering.
- Existing targeted P6, E6.14–E6.17, startup and resource tests.
- Production typecheck and Vite bundling.
- Four real mobile-viewport Chromium/SwiftShader Quick Play executions:
  seeds 23/97 × E6.18 batch ON/OFF, 90 actual live executing frames,
  identical held briefing mode, 0 JS errors, reliable shadow/main
  reconciliation for at least 85 frames in each run.
- **Must save actual p95 main-pass draw calls on both seeds**, and reduce
  environment draws in each matching seed A/B. If it does not, revise or
  back out instead of deploying a no-op optimization.
- No CPU/FPS claims based on instrumented browser timestamps; collect
  counts and inspect preservation of scene visibility.
- Merge/deploy only after prior production exact-build verification,
  no other queued deploy, and all critical checks green; verify
  the new public Pages build stamp.
