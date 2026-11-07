# Rendering R7.9 — global stylized material audition
2026-11-07

## Visual direction
- Two-/three-band cel with adjustable thresholds and Classic/Soft/Hard/Graphic
  tonal profiles. 128-texel nearest-filter shared ramps, updated as a texture;
  slider changes must not allocate another shader program per cutoff.
- A warm, broad, large-cell rim treatment across opaque operator surfaces,
  plus stronger, key-projected near-white accents on marked hard/shiny parts.
- Weapons and their visible magazine/attachments share the hard-surface role,
  not an independently hacked postprocess. The one-tap **Preview with weapon**
  button reveals gear and gun without writing equipment data.
- Stronger violet and violet-noir **world-height** shading is uniform across
  apparel and weapons, rather than resetting each mesh-local strip.
- Plum+ and Plum noir deepen the existing Studio shadow-side hemisphere/fill,
  keeping baked neutral occlusion and cast-shadow geography unchanged.

## Rendering safety
- Studio only. Default modes retain smooth original rendering; all art controls
  are ephemeral and reset with **Compare Original** / **Reset Lighting**.
- Existing source Standard materials remain authoritative; variants are built
  only for the Studio rig and reused per source plus hard/warm role.
- Custom pose-cavity shader hooks are composed without losing their live IK
  Vector2 uniforms. Specialized PBR surfaces retain their Standard shader;
  transparent optics, decals and double-sided glass are excluded.
- No new scene pass, fullscreen outline, per-operator light, texture atlas or
  geometry. Shared ramp textures update in place on cel-threshold changes.
- Stable local-space block cells define the highlight pattern, but world-space
  light direction determines the white hard-surface projection.
- Every return to original styling restores source material objects; rig
  teardown explicitly disposes owned alternatives.
- Main Studio and thumbnail renderer receive the same settings; thumbnail
  work remains single-flight with bounded cache, no new WebGL context.

## Controls
- Cel: Smooth / 2-band / 3-band.
- Cel band character: Classic / Soft / Hard / Very graphic.
- Editable shadow cutoff (2 and 3 band) + highlight cutoff (3 band).
- Rim: Off / legacy Hard / legacy Pixel / Warm + white Graphic.
- Height: Current / Neutral / Sculptural / Strong / Violet / Violet noir.
- Fill: Neutral / Steel / Slate / Plum / Plum+ / Plum noir / Dusk.
- Scope: All surfaces + weapons / Textiles only.
- Preview with weapon action; unchanged standard gear toggles.
- Same original comparison and reset affordances.

## Validation
- Focused shader composition and ramps, inherited pose cavity and R7 controls,
  TypeScript/build, real mobile-sized WebGL screenshot of a visible weapon,
  old Operator Studio interaction smoke, D2 facewear, armor/rig mobile smoke.
- Release preflight: live Pages build matches current main, deployment queue
  empty, no failed production publish. Merge only a coherent release batch.
- Physical Safari performance, visible art acceptance and GPU/thermal A/B
  remain separate from the automated browser smoke. Do not claim measurements
  from the browser renderer info or Node tests.
