# Arsenal A4 — implementation baseline
Audit commit: `7e705d07` on `feat/arsenal-a4-surface-detail-unification`.

A4 is a visual-only detail/finish consolidation; **not** the physical rail/mount
architecture (that follows as a separate milestone).

## Baseline from 35 actual factory models
- 891 emitted meshes, 18,298 triangles across 35 separately built presets.
- 175 marked/detail meshes (includes physical HK selector parts and stamped
  magazine ribbons); 114 overlay meshes, 109 pixel-mark meshes.
- 11 live texture identities, estimated 533,888 RGBA8 uncompressed bytes,
  including 512x256 FNC atlas; textures are lazily cached across builds.
- 4 broad material state classes in factory outputs.
- These are real mesh inventory counts, **not GPU frame rates** or reliable GPU
  submission counts for transparent double-sided objects.

## Findings
- AR, AK and HK use cached little mark maps with independent planes. Repeated
  bilateral marks can share an owned, merged geometry in one submission.
- Translucent DoubleSide mark materials can incur unnecessary two-pass rendering;
  explicit front-face orientation is cheaper and avoids back-facing artifacts.
- FNC P21 atlas already integrates seam/gas/polymer details into source geometry;
  do not replace it with planes.
- AK cover ribs and AR round furniture ribs are actual geometry and should
  remain physical. FAL vents helper is **not currently installed by the
  production FAL core**; do not add decorative polygons solely for parity.
- HK selector art is an important generational identity; don't replace colored
  SEF/pictogram details with texture noise or erase side-specific levers.

## Invariants
Existing IDs, six-slot part definitions, weapon lengths, magazine/reload profile,
optic positions, shot sockets, gameplay, saves and visual material ownership
must remain unchanged. Do not dispose any app-lifetime shared material/atlas.
The actual-production WebGL contact sheets and 64/128px native scale decide
visual approval, not a numeric triangle-only target.
