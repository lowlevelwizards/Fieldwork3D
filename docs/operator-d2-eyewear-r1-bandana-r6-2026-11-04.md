# Fieldwork: Bandana R6 + Eyewear R1 (Nov 4 2026)

## Art direction from mobile build 6881c8c
Chunky, oversized, iconic, representational forms. Make eyewear genuinely legible at phone gameplay zoom, not intricate realistic outlines. Keep the approved facewear and material controls.

### R6 bandana
Six broad tapering tiers: preserve horizontal face wrap and rear knot; fan side cloth into the lower kerchief with a wide stepped tip. Make the middle substantially wider than the termination, while allowing the end to hang below the chin and project away from the cube. Keep 'raised'/'lowered' ID, front axis, no cloth sim.

### Eyewear R1B — civilian and tactical glasses
- Standard: big rectangular + eight-corner round + heavy square variants, chunky top brow, wide bridge and strong temples.
- Aviator: five-corner exaggerated pilot silhouette and a single thick bridge (no thin twin wire frames).
- Wraparound: big angular paired lenses, broad temples and side shields; still clearly distinct from single eyeshield.
- Ballistic eyeshield: a single large shield pane with heavy housing and no skinny rim.
Smallest authored frame bar target ~.4 world units, larger where necessary.

### Eyewear R1C — goggles
- Low-profile: one continuous compact pane + substantial seal.
- Field: deeper dust housing, heavy rim, large side attachments, wide strap.
- Vintage: two big 8-sided eye cups, high-profile rim, broad nose bridge.
Existing 4 goggle positions, standard eyewear variant options, saved IDs, independent lens and frame materials are unchanged.

### R1D gates
- Minimum rim depth and height assertions, broad silhouettes, distinct lens topology
- Correct saved materials and eyewear wear-mode persistence
- Existing D2 tests, `npm run build` with TS typecheck, and mobile Studio smoke
- No dynamic geometry on pose; fixed materials and shapes
- Release checkpoint requires previous deployment successful, public Pages build matches main, and no ongoing Pages deploy.
