# G36 H2.1 — Live Arsenal handguard replacement

**Release scope:** User requested that the accepted H2.1 isolated study become the G36 Original Dual Optic handguard in the actual Arsenal so they can inspect it. This is an appearance-only replacement of H1. Not a new equipment model, attachment, or saved configuration.

## Single geometry source

The exact isolated H2.1 builder from draft PR #1718 is now also imported into the production G36 master. The study view still has its original editable review controls, but the deployed factory uses the identical five-station sculpt **without** the study-only instanced decals.

The live placement maps isolated coordinates to the existing production slot:

- X: 3.75 + 0.97 × study X, preserving receiver contact and front at X=13.45
- Y: -0.21 + 1.04 × study Y, preserving factory support-hand contact, top envelope near 1.35, lower envelope near -1.90
- Z unchanged, giving the approved 3.04-unit width through the center
- Rear roof leans forward, rear lower lip is tapered, front roof stops earlier than the lower lip; main center remains parallel from study X1.25 to7.75.

Factory shape components: one indexed/baked faceted shell with truly inset nose rim, one near-black dark mouth back face, one chunky rear lug. No geometry authored separately to approximate H2.1. The old H1 constructor remains available only to the isolated compare study, not the live model.

## Four graphic side vents

The exact H2.1 vent centers [2.50,4.27,6.04,7.81], each 1.32×0.40 study units, are mapped through the existing **pooled** 384×192 G36 visual atlas, rather than generating eight additional translucent planes in live rendering. This keeps the current large/few graphic vent identity while avoiding draw calls, extra material allocations, alpha-sorting, or added UV textures. The rest of the atlas (one-side receiver ejection and smoked-polymer magazine) remains unchanged.

## Material and gameplay invariants

- G36 main handguard shell and boss: existing `g36-polymer`; front cavity: pooled `g36-lens` dark finish.
- Existing O3 optic, V13 stock, G36 magazine, selector, grip, barrel and muzzle untouched.
- The same `g36LongHandguard` semantic tag and `family-handguard` slot ID; all six saved factory part IDs unchanged, no new weapon or attachment registration.
- No ballistics, contact solver, aim datum, recoil, reload or player-stat changes.
- Two meaningful extra meshes relative to H1 (mouth cavity, rear boss); 24 factory meshes maximum. Nominal production geometry acceptance budget raised from 600 to 760 triangles **only for the revised G36 handguard**. Never extrapolate the budget increase to other arsenal platforms.
- Stock studio, Arsenal, posed weapon, thumbnails and replay all flow through the **same** `buildG36OriginalBlockout` / `addG36Family` factory adapter.

## Release gate

1. Fixed-geometry acceptance: both angled faces, wide flat center, actual inset mouth, single boss, preserved mount and front.
2. Atlas: exactly four black vent rectangles per side, raised, matched at phone scale; ejection still one-sided and magazine unchanged.
3. Material assignment: pooled polymer and dark cavity, no extra per-instance asset creation.
4. Existing G36 P4/P5/P6/P8/O3, Arsenal M2/M3, Ground Zero plus page-specific browser captures remain green.
5. Reconcile main and verify previous public Pages served commit before release merge; after deployment, confirm served build stamp matches new merge commit. Request user review live Arsenal side, three-quarter and mobile front view.

**Fallback:** If new handguard visually needs revisions, iterate isolated geometry first and update factory using the shared builder; H1 source remains as a reversible visual baseline.
