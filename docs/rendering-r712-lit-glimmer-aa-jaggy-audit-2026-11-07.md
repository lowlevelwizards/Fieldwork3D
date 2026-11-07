# Rendering R7.12 — Lit surface accents and alias diagnosis
2026-11-07 · Studio-only audition

## Confirmed problems
- R7.11 added secondary backface hull meshes expanded by 0.32 units,
  rendered with unlit transparent cream; they were visible outside geometry
  and in shadow, producing a permanent halo. Deleted the hulls outright.
- Studio full-size canvas had MSAA off, pixel ratio capped at 1.5.
- Studio's one directional live shadow map used BasicShadowMap, with strong
  step edges and possible stair stepping at close-up.
- Baked occlusion, contact/cast masks and the toon nearest-ramp can ALSO
  create sharp triangular or sawtooth shading boundaries; increasing canvas
  resolution cannot correct underlying mask data.

## R7.12 replacement
1. **Surface-attached, key-dependent highlight:** the R7.11 eligibility
   predicate (weapon assemblies, metal, uncovered helmet shell only)
   selects a variant of the ORIGINAL material. That fragment adds a very
   small cream graphic band after regular light accumulation, gated by:
   grazing camera angle, light-facing normal, received direct lighting,
   and directional shadow visibility via Three's getShadowMask().
   Shadowed and back-facing surfaces should not develop a white glow.
   No expanded mesh, extra draw call, light, or fullscreen post-process.
   Original 10–20% amount slider remains a live uniform.
2. **Cel threshold AA:** 2-band toon shader uses analytic one-pixel fwidth
   transitions at existing cutoff, rather than filtering camo textures.
   Existing shared ramp retained for backwards compatibility/diagnosis.
3. **Studio output AA:** 4× context MSAA default in Studio (opt out with
   `studioAA=off`), resolution 1.5× normally or 2× for detail audit.
   Thumbnail render target gets samples=4 on the same opt-in path.
   Rendering context MSAA changes reload because WebGL creation is immutable.
4. **Filtered shadows:** PCF for the studio's live directional shadow,
   with `studioShadowFilter=hard` comparison and
   `studioLiveShadows=off` isolate toggle.
5. **Diagnostics:** `studioBakedLighting=off` removes baked vertex shade
   contribution from variant materials without altering source geometry,
   `studioCelAA=off` keeps hard cel edge, and the pre-existing
   `operatorLightingDebug=1` inspector independently toggles self,
   external, directional, contact and height layers. A collapsed menu
   exposes the A/B settings and warns that settings reload the preview.
6. **Critical visual evidence:** real mobile-sized WebGL screenshots of
   the same preview, same camera and weapon with AA on/off, density 1.5/2,
   PCF/Basic, live shadows on/off, baked lighting on/off, cel AA on/off.
   Retain captures in the Studio workflow artifact.

## Guardrails
- No tactical mission renderer changes.
- Material eligibility only; glass, soft cloth, bare skin and fabric
  helmet covers remain matte.
- Keep authored pixel camo masters and nearest filtering unchanged.
- Changes to shared baked contact/cast algorithms are deferred until
  diagnostic screenshots establish they cause the visible jagged teeth;
  avoid blindly mutating all campaign operators.
- Verify the production Pages build is successful, its served SHA is the
  last main commit, and no deployment runs when merging. At most one
  release checkpoint for compatible stages.
- Performance check: inspect draw-call counts, compiled programs, loading
  and phone GPU behavior. The new rim removes the previous extra hull
  draw calls, but MSAA/PCF may cost fill bandwidth: compare real devices
  before adopting tactics-wide defaults.

## Actual diagnostic evidence and R7.12 follow-up
Real 390px Chromium captures (Studio workflow artifact on PR #1057) isolate
these contrasts at the SAME camera/model/camo/weapon:
- `r712-aa-pcf.png`: face-under-helmet and upper carrier have fine
  triangular sawtooth shadow boundaries.
- `r712-no-live-shadow.png`: those particular sawteeth largely disappear;
  the large shadowed face also brightens as expected.
- `r712-no-baked-light.png`: the same teeth remain while baked contact
  depth is reduced. The prominent screenshot artifact is primarily
  **live directional shadow-map aliasing**, not baked contact/cast masks.
- `r712-aa-off.png` confirms normal silhouette/diagonal stair steps,
  separate from shadow teeth.

Accordingly the second checkpoint evaluates `PCFSoftShadowMap` and an
adjusted bias (`bias=0.00008`, `normalBias=0.042`) against the old
`PCFShadowMap` / old bias, with 1024 and 2048 shadow-map sizes. Shader
and map-size switches remain Studio-only and reversible in the expanded
Render Quality / Shadow Diagnostics panel. The old 1024/hard/legacy
combination remains available without changing shared runtime shadow bakes.
Prioritize the best jaw/strap edge under real viewing and iPhone cost.
