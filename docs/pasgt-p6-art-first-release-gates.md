# PASGT P6 — art-first release contract

Scope is the PASGT proxy for 1980s/1990s full-cut composite helmets.
Visual priority: Fieldwork's iconic, oversized, chunky, stubby, low-poly
miniature first. Distinctive real PASGT cues second. Detail only when visible
at normal gameplay scale. Every new face must visibly contribute.

## Implemented design decisions

- Shell uses the same handful of original major cuboid pieces. A slightly
  narrower/shallower upper mass emphasizes the big brow and deep side/nape
  protection with no added geometric bevels or high-poly crown.
- Three sewn cut pieces use disjoint UV islands in one atlas: left/top/right.
  Fabric print scale is identical to uniform/rig camo; each printed cut gets
  an authored deterministic pattern phase offset so motifs need not align
  across seams. The real world does not mandate every panel mismatches.
- Two substantial twin seam strokes straddle the top panel, travel the
  length of the crown and continue onto upper front and rear fabric. They
  are pixel art only, not surface-geometry stripes.
- Twelve wider slits (eight perimeter, four actual crown) are honest planar
  buttonhole marks on the fitted cover. They share exact attachment frames.
- Ten authored foliage and scrim roots, two left unused. Each cluster is
  three oversized, premerged flat leaves including one leaning downward.
  Scrim uses two huge flat panels, one fold, deliberately varied length.
- Band remains one broad, fitted strap with two dependent rear cat eyes.
  The simple two-point chinstrap has no buckles and hides for bulky masks.
- Sparse six-path net follows the crown with a few large authored kinks and
  gathers under band height rather than falling like poles.
- No new PASGT customization selectors, no procedural cloth/vegetation, no
  tiny rivets, no changes to ballistic collision or head hitboxes.

## Review and release gates

1. Critical TypeScript/Vite build and P4/P5/P6 focused visual-geometry tests.
2. Actual mobile WebGL captures of bare, plain cover, woodland cover, desert,
   band, foliage, scrim and net at multiple cameras (front/side/rear/3-4).
3. Compare against last production P5 at gameplay scale. Revert proportion
   experiments that weaken the silhouette; no micro-detail to compensate.
4. Test saved wardrobe and facewear combinations, plus normal 4-operator
   scene. No new per-frame mesh/texture creation.
5. Only merge after checks pass and latest Pages deployment is complete,
   verified, serving current main. One checkpoint release, verify public SHA.
