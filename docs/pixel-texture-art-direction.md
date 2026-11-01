# Procedural pixel material contract

Fieldwork's tactical 3D textures are **material treatments**, not silhouettes,
collision, or visibility. The existing simulation remains authoritative.

- Reference operator height: 40 world units (provisional until scale audit).
- Reference source density: 32 integer texels per operator height.
- A 32 x 32 tile covers 40 x 40 world units. Repeat UVs on geometry, not
  on the texture shared between differently sized objects.
- Procedural recipes use integer pixels, a fixed palette, repeatable patterns
  and deterministic seeds. No runtime randomness or per-frame generation.
- Nearest magnification keeps source pixels crisp. Mipmapped minification
  prevents unacceptable distant shimmer on mobile.
- Untextured gameplay masks (fog-of-war, LOS, and interactive selection) stay
  separate from this pipeline.
- Reuse textures across objects; avoid per-object texture/material creation.
- Actual world-unit scale must be normalized with doors, operators, cars and
  furniture before changing the reference constant.
- Atlas graphics are suitable for unique labels; repeating surface maps
  should remain independent to avoid atlas edge bleeding.

Stages: base textures, architecture, fixture surfaces, outdoor resources,
operators, deterministic wear, signage, condition overlays, asset lab and QA.
