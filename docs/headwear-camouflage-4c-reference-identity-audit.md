# Camouflage 4C — all-pattern historical identity audit

## Source and scope
Review all **18** current cloth prints at the same world-pixel scale as the
live boonie/patrol-cap models. Preserve the 4B silhouette/mapping work where
the pattern's characteristic **color family, stroke hierarchy, and direction**
remain distinct. Avoid one global noise / contour treatment across all camos.

Reference baseline:
- US Woodland: four-color temperate woodland; tan, brown and muted green
  separated by slim branching black shadows. See Wikimedia Commons M81
  reference swatch and Safariland's M81 design history.
- Lowland ERDL: the smaller-scale, greener, less contrasted leaf precursor to
  US Woodland; black forks and narrow connected leaves, not the same broad
  M81 swathes. See Wikimedia green-dominant ERDL swatch.
- German desert: Bundeswehr Wüstentarn, sand with many tiny brown and
  dark-green irregular Flecktarn spot groups; not the broad overlapping
  color wash of MultiCam. See original German desert Flecktarn textile photo.
- Finnish M05: photograph-derived, lichen-like four-tone forest micro-print.
- Polish wz.93: black/reddish-brown/olive amoebas on khaki.
- Flora: horizontally aligned Russian wavering bands, already visually
  approved; retain 4B artwork.
- All palettes are stylized approximations for Fieldwork, NOT certified
  textile RGB matches.

## Audited signatures and dispositions

| Pattern | Required visual fingerprint | 4C disposition |
|---|---|---|
| US M81 Woodland | Four muted macro fields, long organic tan/brown/green interlocks, delicate black forks | **Re-tone and branch; score actual 32px crown cut** |
| US 3-color desert/DCU | Widely spaced cream/tan fields and sparse reddish-brown accents | Retain |
| Tiger Stripe | Irregular, broken long directional dark strokes between tan/green | Retain |
| UCP | Subdued green-gray-gray fine square stair steps | Retain |
| MultiCam | Soft multiscale transitional tan/green with dark micro-twigs | Retain |
| German 5-color Flecktarn | Dense clustered multicolor small round droplets over organic base masses | Retain |
| British Woodland DPM | Long brush-tipped strokes and charcoal black branches over muted khaki | Retain |
| Swedish M90 | Angular hard-edged straight splinter polygons, no spot noise | Retain |
| US 6-color desert | Wide sand fields with small broken dark pebble crescents | Retain |
| Woodland MARPAT | Fine dark green/brown digital stair steps and macro regions | Retain |
| Swiss Alpenflage | Distinctive brick-red foliage islands among tan/green/dark | Retain |
| Desert MARPAT | Fine two-scale digital pixels in sand/coyote palette | Retain |
| US ERDL Lowland | Smaller green-dominant organic leaves with thinner dark branches, gentler pigment contrast | **Retone muted; keep fine leaf morphology** |
| Finnish M05 | Dense photo-lichen four-tone mosaic; smallest organic print of collection | Retain 3× |
| Polish wz.93 Pantera | Amoeba black and red-brown spots on olive/khaki, not M81 macro blobs | Retain |
| Russian VSR-98 Flora | Long irregular aligned horizontal reeds | **Preserve exactly (approved)** |
| Rhodesian Brushstroke | Long diagonal green/brown spear-strokes on warm tan | Retain |
| German desert Flecktarn/Wüstentarn | Sand dominant and tiny clustered brown/green spots, not Multicam | **Redraw as 3-color 64px master with distinct rosettes** |

## M81 engineering root cause and correction
A full **64x64** master feeds a **1× print density** atlas. On a 64px UV1
crown, the 1× sampler displays just a **32x32 crop of the master**.
The old placement validator inspected only an 8x10 strip for brown,
allowing almost monochrome crown crops with no black. The 4C seed
selector scores the *actual 32x32 source crop*, weighing all four
colors and the tiny forward strip while retaining stable per-person
and per-reroll offsets. More small branching charcoal marks were
placed across the actual master quadrants; globally M81 is not
over-darkened. Dark pigment is still authored fabric dye rather than
the construction shader overlay.

M81 green, brown, khaki and black now approximately
RGB (75,96,74), (100,82,70), (147,137,115), (37,43,40).
Their purpose is subdued *relative contrast* under Fieldwork's
existing lighting, not exact historical manufacturer colors.

## German desert cloth
The internal wardrobe ID remains `desert-tropentarn` for saved-outfit
compatibility, but the label is **DESERT FLECKTARN**. A 64px repeat
and a three-tone sand / brown / dark olive scheme use sparse
irregular green blotches plus hand-shaped brown/olive fleck
constellations. Physically keep existing 2× density.

## Acceptance
1. Check M81 at 15+ rerolls: crown green cannot dominate; crown always
   contains black forks, brown and tan. Different front/side cuts
   remain intentional, with no seam-specific UV geometry changes.
2. Original versus applied 3D camo color stays aligned: no extra gray
   construction mask; solid headwear still uses the structural finish.
3. ERDL should feel like a gentler, more detailed woodland than M81.
4. Desert Flecktarn must read as small spot groups on sand.
5. Other 15 prints keep characteristic silhouette, direction, density
   and saturation; future changes should be gated on image evidence,
   not automatic global algorithmic normalization.
6. Run headwear regression and production build, then merge/deploy
   only the cohesive patch.

## Public references used
- https://commons.wikimedia.org/wiki/File:%22M81%22_U.S._woodland_camouflage_pattern_swatch.png
- https://commons.wikimedia.org/wiki/File:Green-dominant_%22lowland%22_ERDL_camouflage_pattern_swatch.jpg
- https://inside.safariland.com/blog/m81-woodland-americas-classic-bdu-pattern/
- https://www.camopedia.org/index.php/Poland
- https://www.camopedia.org/index.php/Russia
- https://store.arktis.co.uk/blogs/arktis-intel/m05-finnish-now-at-arktis
- https://tolkostoffe.de/rei-fest-bundeswehr-camouflage-stoff-leicht-armee-segeltuch-187722.html
