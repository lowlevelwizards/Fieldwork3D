# Camouflage readability pass 3C

Focused visual correction of the six recently reviewed headwear prints, preserving
all headwear shapes, print densities, UV1 mappings, operator-seeded rerolls,
outfit saves and the twelve-pattern Lab gallery.

| Pattern | Correction | Current artwork metric |
|---|---|---|
| M81 woodland | Rebalanced saturated bright forest/mid green and warm brown; retains green-forward coverage and brown-front phase gate | 67.8% green coverage |
| British woodland DPM | Unique long green/brown strokes, tapered charcoal twig branches and contrasting khaki windows; rebuilt geometry and own palette | 21.8% khaki, 29.3% green, 30.6% brown, 18.4% charcoal |
| Flecktarn | New moss/green/rust/black 5-color palette; 39 authored spot centers, seven irregular satellite marks per center, 1–2px droplets | 456 horizontal color transitions / 32×32 tile |
| Six-color desert | Keep existing good Chocolate Chip layout and light chips, but change near-black pebble outlines to muted charcoal-olive | Dark from [46,54,44] to [79,72,55] |
| Woodland MARPAT | Keep the existing MARPAT colors, add fragmentary 1–3px stepped details over macro-fields | 333 color transitions / tile |
| Desert MARPAT | Same treatment with independent brighter sandy color mapping | 339 color transitions / tile |

UCP reference: **273** transitions. M81 reference: **174** transitions.
Density is measured from the actual pixel-map indices used by both the Lab
and live operator materials, not from CSS or a mock preview.

Palette choices: M81 and DPM intentionally diverge from the excellent
woodland MARPAT palette; print colors are art-direction targets rather than
claims of exact measured fabric RGB values.

Notes: The Flecktarn and MARPAT microstructure is repeatable, periodic and
deterministic: no runtime random dots, jitter, blur or additional pixels
beyond the existing 32px canonical tile. Other patterns are untouched.

## QA
- Focused headwear/regression tests cover the revised M81, DPM, Flecktarn,
  both MARPATs and the softened Chocolate Chip.
- Production build/typecheck on the PR, with baseline motion gate unchanged.
- Verify at gameplay and inspection zoom in Operator Lab.
