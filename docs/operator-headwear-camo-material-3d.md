# Headwear camo 3D — material separation and visual correction

## Changes

**M81 woodland:** Adopt the exact muted DPM olive, brown and near-black
pigments, with existing dark forest green as the fourth shade. Preserve the
recognizable M81 blobs, existing target coverage, all print offsets and
the forward-panel brown safeguard. M81 and DPM are intentionally separated
by silhouette, not exaggerated hue.

**Six-color desert:** Restore its original ink RGB `[46,54,44]` and
leave the approved Chocolate Chip geometry unchanged. The overly dark
appearance came from the renderer, not the authored ink.

**Flecktarn:** Consolidate the first six medium background polygons into
four broad underlying fields, two forest-green and two khaki. Preserve
the 39 hand-placed fleck clusters plus satellite specks, and all five ink
colors and 2x fabric print density. This restores readable large forms
beneath the high-frequency speckling.

**Headwear material fix:** Camo in `headwearCamoTexture` now directly
copies all four region panels' RGB from the canonical print: no
`headwearRegionPixel` grayscale multiplication. When a camo is selected
in `poseOperator`, turn OFF `MeshStandardMaterial.vertexColors` so the
geometry's structural darkening no longer multiplies the camo again.
When switching back to solid headwear, restore `vertexColors=true` and
the normal grayscale construction atlas. The physical roughness map and
actual 3D lighting remain enabled for both cases.

This makes the Lab's original 32px swatch and its 3D applied fabric use
the same pigments. Color differences from scene illumination still occur
naturally; the fix only removes the *unintentional geometry/atlas
darkening overlays*.

## Acceptance checks

- M81 must no longer look lime green; its green, brown, dark ink are
  exactly shared with DPM where appropriate.
- DPM remains unchanged from the approved 3C artwork.
- Six-color desert keeps the approved pebble shapes and original dark ink,
  now without darkening multiplied through its fabric atlas.
- Flecktarn has large readable woodland forms beneath many fine dots.
- All four region atlas panels preserve pixel-for-pixel RGB from their
  canonical authored pattern, at the correct native 1x/2x density.
- Switching to/from solid headwear restores solid construction shading
  and does not alter the underlying geometry, fabric UV1, roughness or
  saved seeded print placement.
- Production checks remain scoped to headwear and typecheck/build.
