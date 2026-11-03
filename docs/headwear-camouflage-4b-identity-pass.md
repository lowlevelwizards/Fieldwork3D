# Fieldwork Camouflage 4B — visual identity reconstruction

## What went wrong in 4A
Palette consolidation accidentally made the six new prints look like siblings
of existing M81, DPM or MARPAT. A handful of broad polygons made the new
designs too simple, particularly Finnish M05.

This pass leaves the **twelve previously approved patterns** untouched and
deliberately introduces pigments where the real patterns have an identifiable
color temperature, value or contrast different from existing inks.

## Pattern-specific redesign
| Pattern | Macro identity | Fine identity | Scale | Distinguishing palette |
|---|---|---|---|---|
| ERDL Lowland | Organic foliage with small green/tan negative spaces | Interwoven dark forked twigs, compact leaflets | 2x | Fresh leaf green, lighter khaki, warm brown |
| Finnish M05 | Organic photographic forest lichen, *not* conventional square digital | Two-scale coherent 2–4px moss micro-islands | **3x** (was 2x) | Apple green, gray-earth, dark spruce, charcoal |
| Polish wz.93 Pantera | Reddish brown/khaki amoeba on forest green | Comma-shaped ink hooks and curling uneven green fragments | 2x (was 1x) | Distinct light olive, rusty earth and black-green |
| VSR-98 Flora | Long horizontal waves/reeds across fabric | Broken small wavelets with irregular width | 1x | Straw olive, blue-green, warm ochre-brown |
| Rhodesian Brushstroke | Angled slashes on yellow khaki | Long tapered fine brush fibers, not dots | 1x | Pale yellow-khaki, rich russet brown, dry forest green |
| German desert Flecktarn | Pale sand ground | Clusters of tiny rust-brown/green droplets, not big islands | 2x | Creamy warm sand, clay brown, muted olive |

**Historical naming:** the earlier recipe ID `desert-tropentarn` stays
unchanged for backwards-compatible wardrobe saves, but the UI label
becomes **DESERT FLECKTARN**: the pattern is actually the Bundeswehr
three-color Wüstentarn; Tropentarn can also refer to the tropical
five-color Flecktarn uniform. New pattern is intentionally based on the
desert references.

## Rendering contract
- Details are deterministic at master-tile generation, *not* per-frame noise.
- Periodic lattice sampling and all dot centers wrap within the same 32px
  art tile; no blur, bilinear filtering or GPU procedural effects.
- Palette differences are intentional and no global color-consolidation
  pass touches the other twelve prints.
- Finnish 3x density is implemented in the actual 128px UV1 atlas via
  `floor(pixel*3/2)`, not a label or mock screenshot. Nearest sampling
  stays enabled.
- Operator Lab's original/tiled previews use the exact same pixel source
  as each outfit's live material, and per-operator seeded cuts persist.
- Six new patterns get separate density/texture/uniqueness regressions.

## Evaluation criteria
At minimum check all six in original artwork, tiled artwork and 3D
headwear at standard gameplay scale. The result should read as:
- *ERDL:* dense organic foliage, not broad M81 spots.
- *M05:* fine variegated lichen, distinctly smaller than in 4A, not
  a crude Swedish M90-like geometric print.
- *Pantera:* small dark amoebae and brown/olive patches, not M81.
- *Flora:* conspicuously horizontal rhythm rather than scattered patches.
- *Rhodesian:* broad diagonals with thin brush fibers on warm yellow tan.
- *Wüstentarn:* many tiny islands of olive and brown on mostly sand.

New pigment values are conceptual art matches from reference fabrics,
not claims of colorimetrically measured military textile standards.
