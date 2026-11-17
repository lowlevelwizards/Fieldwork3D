# E6.24 — static service and exterior prop cache expansion

**Stacked feature:** E6.24 builds on the E6.23 feature branch; do not merge independently into main.

Opt in with `?e624Service=1`, which activates the E6.23 core rigid fixture cache plus an additional twelve box-authored static props: toilet, bathtub, mailbox, screened dumpster, vending machine, wayfinding sign, trash bin, bollard, utility cabinet, parking block, parking sign and street lamp. `?e623Fixture=1` alone continues to use only E6.23 families; both default to OFF.

Reuse the exact same authoring functions, material recipes, bounding volumes, per-fixture fog/cover owner groups, orientation and wear; only immutable GPU geometry is shared and the local rigid boxes are merged once per versioned recipe. The renderer owns every finishing material, animation, light source, cover footprint, damage and tactical state.

**Excluded:** Character/vehicle props, alpha foliage, bike rack curved hoops, animated doors, rigged operators and any asset with custom art variant, condition or surface. The twelve candidates are selected because their currently authored visuals are entirely box geometry.

## Acceptance gate
1. All twelve families (two index variants) match legacy bounds, box counts and shadow flags; no detached source geometry remains cached.
2. Site palettes and owner visibility stay independent and geometry remains live until the last lease is released.
3. E6.22/E6.23 predecessor regressions and production build pass.
4. Fixed-seed live browser on/off, shadow/draw and screenshot parity, actual cache adoption and device teardown are required before any default-on or merge.
5. Never stack production merges while Pages deployment or concurrent release checks are running.

This stage does not claim any realized browser FPS/VRAM improvement until separately measured.
