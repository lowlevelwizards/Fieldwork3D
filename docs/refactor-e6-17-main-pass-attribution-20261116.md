# E6.17 — Main-pass draw/material attribution

E6.16 measured actual live shadow-map p95 1.1–1.8ms versus non-shadow
16.3–21.6ms on Chromium SwiftShader. Shadow-map refresh is intentionally
every running frame to avoid stale moving-soldier shadows. E6.17 therefore
focuses on **actual non-shadow renderBufferDirect submissions**, NOT changing
the renderer or removing shadows.

## Method
Only `?coldBench=1` installs an observation wrapper over Three r180
WebGLRenderer.renderBufferDirect, chained with E6.16's real shadow-map
wrapper. Frames contain actual material/type and draw-count deltas from
renderer.info. Shadow submissions are **excluded** using the existing
render phase marker, rather than assuming a material shader name.
Material instance ID, readable material name, transparency, alpha
testing, instancing and skinning are tracked without moving meshes,
changing materials, shader source, draw order or simulation.

Each of E6.14's 90 live callbacks retains prior E6.15/16 evidence and
adds `sceneAttribution.mainPassAttribution`:
- P95 draw calls, renderer buffer call count, distinct materials and
  opaque/transparent/alpha-test/instanced/skinned draws
- Top material-type draw totals over the bounded capture
- Top 12 **per-frame** material instances, pooled into a bounded
  12-item observed-draw list (lower bound for instances outside
  each frame's top 12)
- Frame counts with trustworthy draw deltas and **required reconciliation**
  with E6.16 nonshadow totals; missing/unreliable values are not zeros.
  Three r180 resets renderer.info after the shadow map pass, so the
  end-of-render counter is main-pass-only when info.autoReset=true.
  E6.17 corrects the E6.16-derived nonshadow draw accounting and
  reports combined total as the sum of shadow plus main-pass draws.

The wrapper preserves the original method's receiver, arguments,
return value and thrown exception. Zero additional WebGL submissions,
GPU fences, readbacks, flushes, context resets or async reporting.
No changes to fog, LOS, silhouette, lighting, PCF 512px shadows, actor
physics/animation, player knowledge or fixed 60Hz simulation.

**Measurement interpretation:** Per-object wall timings add substantial
instrumentation overhead and cannot be directly compared against
uninstrumented GPU/RAF timings. Category draw counts are more reliable
for choosing targets. No browser software numbers are iPhone hardware
FPS or GPU timestamps.

## Test and merge gate
Run exact-node focused tests, existing E6.16/E6.15/E6.14/E6.13,
production TypeScript and Vite build, and four fresh Chromium
SwiftShader real Quick Play sessions (seed 23/97 × briefing hold ON/OFF)
with 90 genuinely executing 3D callbacks, with no JS errors.
Keep off main until gates pass, prior Pages exact SHA verified, and no
production deploy is running. Release one batch and verify its own
public GitHub Pages build stamp.

## Follow-on
Choose an **E6.18 material/draw consolidation** only after the measured
material classes and top offender identifiers are inspected and
visual parity tests can cover the exact affected objects.
