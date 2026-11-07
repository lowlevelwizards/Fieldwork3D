# Rendering R7 — staged implementation ledger (2026-11-07)

Branch: `feature/r7-rendering-studio-performance-20261107`  
PR: [#1030](https://github.com/lowlevelwizards/Fieldwork3D/pull/1030) (draft, no production release)

## Design contract
- Preserve Fieldwork's chunky sculptural silhouettes, camouflage/UV authority,
  baked contact AO, pose-aware cavities, tactical fog-of-war and fixed-step simulation.
- Studio and appearance cards use a shared inspection-light and background profile.
- Stylized alternatives remain URL opt-ins until real device visual and GPU review.
- Do not introduce an extra full-screen pass, per-actor lights, or hidden simulation pause.
- Never mistake CPU `renderer.render()` time for actual GPU milliseconds.

## R7.1 — Studio lifecycle and hidden work (implemented)
- Bounded 60-second warm Studio iframe retention. Reopen sends latest authoritative
  roster/readonly state without discarding the compiled renderer/rig.
- Hidden Studio suspends armed-preview frame loops and appearance thumbnail jobs.
- Full-screen Studio suppresses obscured tactical scene, overlay and feedback draws,
  without stopping the game's fixed-step authority.
- Real preview-ready marker requires an operator rig; preview and thumbnail-readback
  timings are exposed on their respective canvas/grid elements.
- Pending: physical iPhone context-loss and 30-cycle memory-soak measurement.

## R7.2 — Inspection presentation parity (implemented)
- One `OperatorStudioLighting` profile and neutral `STUDIO_INSPECTION_BACKGROUND`
  for full-size Studio and 160px appearance cards.
- Thumbnail shadows use a bounded 512px map; full-size Studio retains its current
  1024px default. Actual model light directions, strengths, colors and filtering match.
- All thumbnail categories use the same linear-to-sRGB pixel readback conversion.
- Studio-only opt-in R5 toon ramps now apply to cards as well as the main model.
- Pending: matched-camera visual screenshots; experiment-only UV1 atlas parity
  and acceptance of any broader tone-map migration.

## R7.3 — first visible-frame shader preparation (implemented; unmeasured)
- Quick Play runs `renderer.compileAsync(scene,camera)` before the first visible
  tactical frame and logs `shaderPreparationMs` in startup diagnostics.
- `?gpuWarmup=0` disables the extra step for identical-seed A/B comparisons.
- Ordinary first render remains the fallback on compile failure.
- Pending: cold/warm A/B on physical Safari, largest blocking interval,
  GPU timing, texture preparation, and a decision whether default warmup helps.

## R7.4 — opt-in sculptural gradient and colored-fill auditions (implemented)
- `?operatorGradient=neutral|sculptural|strong` selects root-relative gradient
  curves; unrecognized/default keeps the approved R5 curve.
- All profiles bake into existing vertex colors, clamp safely to byte range,
  reuse ungraded baseline, and add no dynamic light or material pass.
- `?operatorShadowColor=steel|slate|plum|dusk` changes the shared
  Studio/card shadow-side hemisphere/fill colors, never neutral baked AO.
- No default gameplay, camouflage, rig, or simulation changes.
- Pending: user-approved comparison screenshots and performance review.

## Known compatibility gate before R7.5 rim/cel promotion
- R5 Studio toon converts selected `MeshStandardMaterial` to
  `MeshToonMaterial` while R5 pose cavities use `onBeforeCompile` hooks.
  Preserve cavity function and authoritative material behavior before combining
  new cel/rim effects.
- Prefer one composable shader-feature policy with bounded program variants.
- Test motion, helmet orbit, alpha/glass, fog edges, cloth and metal separately.
- Rim pixel stepping must not crawl across the surface or become an outline.
- Cool fill is an audition, not a replacement for actual cast-shadow logic.

## Validation & release
- Focused PR gate: R7 foundation/audition tests + inherited R5 height/toon
  contracts + `npm run build`.
- Existing Studio mobile smoke also runs on the draft PR; physical-device
  screenshot acceptance remains separate from browser emulation.
- Do not merge while any critical check fails or while a Pages deployment is
  queued/running. Verify the previously deployed SHA before the next release.
- Release checkpoint A/B: stable lifecycle, shader warmup and thumbnail parity;
  experimental visual flags must remain non-default until approved.
