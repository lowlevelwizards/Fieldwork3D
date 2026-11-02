# Headwear camouflage 3B — seven-pattern audition

## Boundaries
The five approved 3A camouflages remain pixel-for-pixel unchanged. All seven new patterns
are individual seamless 32x32 polygon-authored tiles. The existing 128x128 UV1 sewn
fabric atlas, original 64x64 UV0 construction atlas, nearest filtering, physical
roughness, seeded per-person print phases and persisted rerolls are reused.

This release is a **reviewable audition**, not an automatic production merge.

## Pattern specifications
| ID | Visual signature | Density | Main inherited colors | Distinct new pigment |
|---|---|---|---|---|
| flecktarn | small spot constellations over mid-green masses | 2x | M81 green, tan, forest/near-black | muted reddish brown (137,83,66) |
| woodland-dpm | diagonal stretched brush ribbons and tapered black branches | 1x | Tiger tan/green/deep charcoal, M81 brown | none |
| swedish-m90 | hard straight-edged zigzag splinters | 1x | M81 mid/dark greens and near-black | bright green (143,159,101) |
| six-color-desert | sand swathes with black-edged pale pebble chips | 1x | DCU sand, MultiCam cream, M81 brown/dark | none |
| woodland-marpat | layered large digital green-brown regions with fragmented edges | 2x | M81 woodland four colors | none |
| alpenflage | red islands among branching forest and tan regions | 1x | M81 green, brown, near-black; MultiCam tan | brick red (160,64,52) |
| desert-marpat | pale macro digital areas with sparse dark speckles | 2x | DCU and MultiCam sand/khaki, desert brown | none |

The three new pigments are deliberately local to the patterns that need them;
existing authored pixels are not recolored. Their physical print density
is independent of pixel density used for the shell construction texture.

## Compatibility
- Patrol cap and boonie: all twelve patterns.
- ACH: includes the new Flecktarn, DPM, M90, Chocolate Chip, Woodland/Desert MARPAT.
- High cut: Flecktarn, M90 and both MARPATs (and existing variants).
- PASGT: DPM and six-color desert (alongside pre-existing M81 and DCU).
- Beanie and Soviet steel remain solid-only.
- Alpenflage is auditioned on cloth patrol/boonie hats, not bare composite helmets.

## Operator Lab review
The standard swatch grid is still used to apply compatible patterns. Expand
**COMPARE ALL 12 · UNIFORM SCALE** to see the same raw 32x32 source and threefold
repeat at uniform display size for every option. Ineligible combinations remain
visible as disabled studies. Selecting an eligible card applies it to the
**actual 3D operator**, using the current Lab camera, pose and lighting; the
comparison tile is a print study, not a pre-rendered 3D helmet. Existing 3A
raw/repeat inspector, active-swatches, second-tap reroll and save/import flow
remain unchanged.

## Rendering and QA
- Cache atlas by headwear model, pattern and offset phase (not operator).
- Evict the least-recently-used texture after 192 cached cuts, with GPU disposal;
  the active pose can regenerate and bind a previously evicted cut on demand.
- Regression coverage: twelve distinct tiles, target color coverage, saved
  identity and eligibility, M81 front green bias, pixel density, deterministic
  seeded print, UV1 channel, stable material changes, UI comparison access.
- The PR's focused headgear suite and Vite production build gate the audition.

## Review checklist before approving production
1. Open Operator Lab on a desktop or phone and expand the comparison.
2. Look at all patterns as original source, repeated sample, and live 3D headwear.
3. Compare normal gameplay zoom with close-up; avoid noise collapse (Flecktarn/MARPAT),
   boring blocks (M90), overbright red (Alpenflage), and overdominant dark sand
   (Desert MARPAT).
4. Check front, side, and top on permitted headwear; reroll several operators.
5. Only after visual approval, merge this single PR and allow the standard
   `main` GitHub Pages deployment.
