# G36 R4 — fire-selector indexing and smoked magazine graphic

**Source of change:** User's 10:46 AM November 18 mobile Arsenal captures `IMG_8810.png` / `IMG_8811.png`. The new SEF letters are clearly visible but line up in a column ABOVE the lever; they do not describe which arc position the selector occupies. User also wants a visible but restrained magazine texture after the R1 removal of crude hard vertical bars.

## Reference / design decision
- Original HK G36 has an SEF trigger group as well as pictogram alternatives (HK G36 Technical Data and HK Combined Catalog 2013). With the original left-side lever viewed from outside, S represents horizontal/Safe, E approximately 45° down/Semi and F vertical down/Auto. Relevant public manual listings: https://s3.amazonaws.com/hk-manuals/files/Catalogs/Combined/HK_Combined_Catalog_2013.pdf and https://s3.amazonaws.com/hk-manuals/files/Military/G36/G36_Technical_Data.pdf
- G36 magazines are translucent smoky polymer, showing angled rounds and coupling studs. We simulate this with OPAQUE atlas details, not alpha blending, transparent geometry, or live shading changes.

## R4A — meaningful SEF positions, no floating letters
- Preserve physical selector pivots at `(-5.20,-1.96)` and original broad paddle geometry (G36 only, six facets, both sides).
- Replace the previous single vertical S/E/F mapped rectangle with three **independently placed glyph quads PER SIDE**, merged into ONE prebuilt indexed mesh/material:
  - S white: `(-4.04,-1.84,z±1.167)` on the lower receiver, horizontally to the right of the pivot;
  - E red: `(-4.36,-2.57,z±1.035)` on the upper pistol-grip face, at roughly 45° down;
  - F red: `(-5.17,-3.12,z±1.035)` below the pivot on the pistol-grip face, nearly vertical down.
- Preserve existing single 24×20 source `hk-selector` texture, cropping only each 3×5 pixel glyph for each quad using explicit UVs. White S and muted red E/F color values unchanged. Batch 6 quads, 12 triangles, one mesh (was 2 quads / 4 triangles) and no new texture/material/draw call.
- Make sure S sits on the actual receiver side, E/F on the slightly shallower grip side; overlay sits ~.025 units above host face. Keep true SEF and existing color/modes, no gameplay selector-state changes.

## R4B — smoky G36 magazine, graphic-only
- Do NOT reintroduce the heavy vertical interior stripes R1 rejected.
- Draw six faint, broad, canted silhouette rows through the existing 96×96 per-face magazine tiles, shades 226 and 233 on base 255, representing partially visible cartridge stacking through smoked polymer. Lean ~.13 units across x and space by .66 units in y from -3.80 down.
- Add just two shallow coupling impressions: 0.17-unit radius darker gray 211, 0.065-unit radius faint lighter center 246. Avoid bolts, pins, faked alpha, noise shader or micro ribs.
- Keep existing matte `g36-smoked-mag` single physical material, no real transparency, same 30-round 5.56 magazine geometry, current reload/hand/grip datums and all factory part IDs.
- Both magazine side tiles are identical and filled only in intended local bounds. The remainder of 384×192 atlas remains stable, including handguard vents, one-sided ejection port and two muzzle graphic slots.

## Budget / regression
- Baseline R3 = **468 triangles, 23 meshes** (production census). R4 = **476 triangles, 23 meshes** (+8 triangles for six independently placed SEF glyph quads, zero added materials/textures).
- Add R4 source assertions for precise SEF glyph arc, 3 cropped letters x 2 sides, palette preservation, UV crop, no cursor-posing/gameplay change, textured magazine side symmetry/opacities/pooling, and actual Arsenal adapter.
- Retain H3, R3 magwell, barrel/flash hider and O3 dual-optic proportions unchanged.
- Run dedicated G36 tests, TS/build, production WebGL/mobile capture, Arsenal mounting/geometry and Ground Zero smoke checks. Keep on branch for visual review, do not claim live until explicitly merged and Pages verified.
