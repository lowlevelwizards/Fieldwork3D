# Fieldwork Camouflage 4A — coordinated expansion and palette review

## Delivery plan (one PR / one production merge)

1. **Audit:** Compare all existing authored RGB values, preserve important
   value contrasts, consolidate nearly identical pigments.
2. **Foundations:** Support 32px and 64px canonical seamless master tiles
   without rescaling fabric texel-to-world density or UV1 sewn panels.
3. **Corrections:** Replace the small repeating M81 design with a 64px,
   four-color green/brown/tan/dark flowing woodland tile; make the dark
   Chocolate Chip marks smaller and more numerous while preserving its
   approved sand/mud fields.
4. **Six new recipes:** Independently author ERDL Lowland, Finnish M05,
   Polish wz.93 Pantera, Russian VSR-98 Flora, Rhodesian Brushstroke and
   German Tropentarn. Share inks where suitable, retain each print's
   authentic directional/macro pattern language.
5. **Integration:** Extend the headgear selection lists and Operator Lab
   to 18 options; dynamically show 32px vs 64px original previews.
   Preserve seeded rerolls, palette identity, live 3D preview, pattern
   pixel filtering and cache bounds.
6. **Release gate:** Run focused headwear regression, production build
   and critical motion/animation checks. Merge and deploy this combined
   build only after automated checks succeed.

## Palette audit

Original library: **12 patterns**, **54 RGB assignments**, **32 distinct
RGB values**. Multiple exact values already shared across patterns.

Measured near-duplicates by approximate CIE Lab ΔE76, useful for the
first-pass review but not a claim about physical fabric color calibration:

| Original RGB | Canonical shared RGB | Approx ΔE76 | Outcome |
|---|---|---:|---|
| MultiCam shadow green (67,84,64) | existing forest shadow (64,83,66) | 2.05 | Condensed |
| Tiger Stripe black-green (42,55,43) | existing near-black (46,54,44) | 2.66 | Condensed |
| Flecktarn ink shadow (42,48,37) | existing near-black (46,54,44) | 2.87 | Condensed |

Other near-neighbors **remain deliberate**: DPM/M81 warm charcoal
(48,55,39) is not identical to cool near-black (46,54,44); sandy
MultiCam cream, chocolate-chip pale glints and DCU tan each serve
different contrast and visual-role requirements. UCP's three close
gray/green tones must stay differentiated. In these cases, reducing
the palette further would reduce readability more than it saves.

Result: **29 unique RGB values across 18 camouflage designs**, with
**zero new RGB colors needed** for this six-pattern batch.

## Individual authoring specs

| ID | Print density | Motif | Reused palette |
|---|---:|---|---|
| ERDL Lowland | 2x | Smaller organic leaves, black connecting twig lines, khaki holes | DPM greens/tan and brown |
| Finnish M05 | 2x | Sharp digital forest squares over larger stepped forest fields | M90 forest, bright green and near-black |
| Polish wz.93 Pantera | 1x | Amoeba-lobed interlocks with green fingers and distinctive khaki openings | DPM/M81 olive, tan, brown, charcoal |
| Russian VSR-98 Flora | 1x | Repeated broken horizontal reeds and layered dark olive bands | Tiger / woodland olive and earth |
| Rhodesian Brushstroke | 1x | Large diagonal painted brushstrokes with tapered feathered tips | Sand, DPM olive/brown, warm charcoal |
| German Tropentarn | 2x | Sand-first larger patches and clusters of sparse brown/green droplets | DCU sand, dark coyote, MultiCam sage |

### Corrections

**M81:** 64px continuous organic master (instead of a visibly looping
32px arrangement), four color families (green/brown/tan/near-black),
including green fingers through tan negative space. The 64px pattern
does *not* enlarge individual pixels or alter its established 1x print
density. Front-crop brown rejection and seeded 0–63 offset selection
retain multiple different helmet/hat cuts.

**Chocolate Chip:** Keep sand/khaki layout and original near-black
pigment, but replace oversized dark-ringed rocks with 11 compact
broken crescent/dash motifs and pale flecks, dispersed rather than
ordered. Physical camo color is already protected from the structural
darkening pass.

## Headgear compatibility

- Patrol cap and boonie: all 18 patterns.
- ACH: all six new auditions plus existing compatible options.
- High cut: Finnish M05, Polish Pantera and Tropentarn added.
- PASGT: ERDL, Pantera, Flora and Rhodesian Brushstroke added.
- Beanie and Soviet steel: remain solid-only.

## Validation

The actual pixel-art source, 3x3 repeat, helmet fabric map and saved
reroll must be consistent, with native 64px/32px dimensions. Print
placement is still deterministic and offset in native texels. Existing
approved DPM/MARPAT/M90/Alpenflage shape geometry stays unchanged;
only the three selected near-duplicate pigment values change.
