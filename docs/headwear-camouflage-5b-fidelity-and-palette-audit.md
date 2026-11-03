# Camouflage 5B — Twelve-Pattern Recognition and Palette Audit

## Goals and constraints

Refine the twelve designs added in 5A (catalog positions 19–30) without
reworking the preceding 18 accepted patterns. Maintain original, stylized
pixel art rather than copying or tracing modern uniform prints. Distinctness
comes from the historical pattern's characteristic *structure*, not
artificially maximizing differences between related patterns.

Audit each artwork on canonical source, repeat preview, 64px UV1
fabric crown at physical print density, and sixteen seeded rerolls.
Preserve saved garment IDs, equipment compatibility, nearest filtering,
solid-color structural shading separation, deterministic per-operator phases
and existing 30-pattern filters.

## Specific decisions

| Pattern | 5A problem | 5B refinement | Density |
|---|---|---|---|
| Belgian Jigsaw | Straight color slabs; occasional one-color crown | Hooked color tabs and notches, restrained dark breaks, distinct mustard/wine/blue-green; seeded crown guard checks five-color composition | 1× |
| East German Strichtarn | Dashes too large/sparse and background mottled | Native 64px quiet taupe cloth, much denser tiny vertical reddish-brown rain marks; subdued secondary ink | 2×, new 64px |
| US Mitchell Leaf | Generic color patches; leaf absent on hat | Explicit lobed foliage and stems, green/tan negative spaces; 2× shows more foliage on worn crown | **2×** from 1× |
| German Splittertarn 31 | Soft splinters and thick rain | Hard angular shard points, tan inverse cuts; shorter 1px vertical rain-overprint | 2× |
| Australian DPCU | Too much blank pale area | Dense irregular overlapping rounded jellybeans in warm earth, olive and charcoal | 2× |
| Italian Vegetato | Horizontal woodland smear | Broken oblique nested leaf tongues, fine angled edges, rich warm brown/olive hierarchy | 2× |
| OCP / Scorpion W2 | Too easily confused with MTP/MultiCam | Broad mostly horizontal sage/umber shapes, restrained bark marks, fewer hooks | 2× |
| Russian EMR | Too much brown/coarse | Green-dominant extra-fine pixel fragmentation, brown supporting rather than dominant | 3× |
| PLA Xingkong | Generic coarse digital | Very fine micro-stars on subdued cool-gray/olive fields | 3× |
| CADPAT Temperate | Accent green too loud | Less saturated yellow-green; keep strongly dark black/evergreen fractal masses | 2× |
| British MTP | Too similar to OCP | More prominent swept DPM-like hooks and angled dark fronds, pale MultiCam-family colors | 2× |
| Indian Army Digital | Generic digital print | More nuanced stepped olive/buff/earth clusters; original pixel artwork, not a copy of India's registered design | 2× |

### Palette-condensation audit

The twelve patterns previously had **60 pigment assignments and 57 distinct
RGB values**. Comparing close colors with approximate perceptual Lab
distances yielded eight meaningful cross-pattern color reuses, while
replacing CADPAT's overly saturated highlight green with a quieter,
still-characteristic green. The batch retains **49 distinct RGB values**
across 60 assigned color roles.

Specific assignments now share identical RGB values when the difference
was visually negligible:
- Belgian Jigsaw light accent shares modern pale khaki (208,188,144 →
  206,189,149), retaining the signature mustard/wine/blue-green.
- OCP dark ink shares British MTP charcoal (73,73,60 → 67,72,59).
- Xingkong gray-green and brown blend with existing OCP and Strichtarn
  neutrals respectively (90,101,79 → 89,105,84; 101,85,74 → 101,84,69).
- British MTP taupe highlight shares Xingkong cool taupe
  (158,143,111 → 151,140,112).
- Indian Digital olive, brown and near-black share existing woodland and
  Russian earth inks (79,101,75 → 75,96,74; 105,78,62 →
  111,80,63; 48,58,44 → 40,56,43).

**Protected signature contrasts remain distinct:** Belgian mustard/wine/
blue-green, Auscam orange-brown, Italian reddish earth, Xingkong neutral
taupe, Russian foliage base and CADPAT's bright forest accent. Colors
were shared only where the similarity did not erase a pattern's identity.

### Placement and rendering

- The top UV1 crown region has a 64×64 sampler. A 1× print shows a 32×32
  crop of a 64px source master; 2× shows the full 64px master.
- New exported `headwearCamoAppliedCoverage` computes **actual
  worn-crown pigment proportions** using the same source phase and density
  as the live material atlas. Avoid comparing a full 64px master with
  a 32px crop.
- Belgian Jigsaw gets deterministic crop selection using minimum mustard,
  burgundy, blue-green, dark-outline and cream portions and a maximum
  single-color dominance. Other 2×/3× prints inherently expose the full
  64px master or more on the crown; their primary fix is motif frequency.
- Existing M81 guarded placement, other 18 patterns, UV1 panel layout,
  saved roll progression, texture caching and solid-color shaders remain
  unchanged.

### Release acceptance

- 30 existing pattern identities, all four existing preview/atlas use
  cases and preserved wardrobe data pass regression.
- Twelve new pattern coverage targets recalibrated to measured pixels,
  and enforced under tight tolerance.
- All twelve remain different images, with at least two dominant inks;
  specifically DPCU should avoid >50% pale, EMR should not be brown
  dominant, CADPAT bright green should be restrained, and Strichtarn
  should remain predominantly quiet taupe.
- Applied 3D UV1 sampling must match the exact source RGB (no grayscale
  overlay). Belgian seeded rerolls keep multiple signature colors.
- Keep the CI minimal: focused headwear test plus existing mandatory
  production build and motion gates. Merge and publish only after success.

Note: These are pixel-art approximations of military camouflage family
characteristics and *not* certified measurements of military textile inks.
