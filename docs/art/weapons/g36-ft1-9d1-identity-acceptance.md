# G36 FT1.9D1 — Final identity pass & real Arsenal peer-scale acceptance

**Historical model:** Full-size Bundeswehr original dual-optic HK G36 (not G36K/C or later rail). These are artistic exterior dimensions, not firearm manufacturing data.

## Iterations

- D1a: lengthen original magnified optic silhouette, keep the upper reflex sight squat and physically joined, and add **one six-facet end face**. Avoid an accessory rail or false dual-sight tower.
- D1b: **one 384×192 RGBA8 nearest-neighbor atlas**, 8 authored region/side tiles, UV projected directly onto existing receiver, lower, magazine and fore-end. Right-side receiver port only; opposite receiver face has no copied port. Four large side vents per handguard and three broad polymer magazine ribs per side. No overlay meshes, transparency, new shaders, frame-tick work or clone-on-repeat material allocations.
- D1c: actual same-scale M16A2/FNC comparison produced a G36:M16A2 ratio **0.9339** when the lab's G36 model used 0.94 X scale. With the original model X span 34.55 art units, a G36 X display scale of **1.00** gives a computed peer ratio close to **0.9935**. The shared `G36_B_ART.displayLongitudinalScale` now makes this an explicit visual datum for future rig presentation, not a hidden lab-only hack.

## Art acceptance and evidence

Run actual geometry tests, full production TS/build, seven real peer builders, flat/clay/factory side + quarter + opposite + top + front and 64/128px/mobile WebGL capture. Retain latest capture artifact in the PR for side-by-side human review.

Pass gates:
1. All four primary graphic regions show without new draw meshes.
2. Real front optical cap intersects housing; factory integrated dual optic is distinct from optional mounted accessories.
3. True stock, handle and trigger voids remain visible. Structural junctions stay connected.
4. Measured displayed G36:M16A2 length ratio in the **real builders** is 0.97–1.03, while the FNC receives no visual scaling modifications.
5. UVs side-correct and no performance regression from repeatedly applying the preview finish.
6. **Human visual approval remains pending.** Successful automated captures do not authorize live Arsenal registration.

## Next E-stage integration contract

Preserve six appearance slots; add G36 family with a **unique visually authored G36 magazine**, not an assumed STANAG magazine. Carry original integrated optics without automatically generating duplicate add-on scopes. Reuse the exact original geometry builder and shared materials in Arsenal, operators, dropped weapons and replay; derive stock/magwell/grip/support/muzzle from one authoritative art contract. G36K/C and issued-faction decisions remain out of this checkpoint.

Review release gates across the rest of the active repo: **do not merge now** while other branches deploy and while this PR still awaits visual sign-off.
