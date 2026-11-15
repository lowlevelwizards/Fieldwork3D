# FAL P5 — Triangular crown art pass
## Why another pass
P4 passed tests but the rifle continued to look like a beveled extrusion.
The roof half-width was 1.16 against 1.69 side half-width, and the sloping
shoulder was only 0.76 high. This preserved ~75% vertical rectangular walls.
P5 deliberately remakes the primary volume instead of adding details.

## Geometry implementation
- P5A: receiver roof half-width 0.67, maximum side half-width 1.85,
  2.06-height triangular shoulder across 3.06 total central height; same six
  stations and eight ring corners (same polygon budget).
- P5B: handguard roof width 40% of lower shoulder half-width, upper
  slope 2.0 high; same 4 stations and 8 faces. A shared (x,y) surface function
  positions three six-corner vents per side without floating surface decals.
- P5C: right ejection scoop is projected onto the actual slope; left charging
  lever and runner are small one-mesh *solid* surface-following plates; the
  carry-handle support pitches from the shoulder to the offset upper grip.
  Pivot and trigger guard remain geometric identity landmarks.
- P5D: chunkier silhouette language: a more deeply pinched fixed-stock
  neck, stronger sweep on the pistol grip, exaggerated single carry handhold.
  No tiny pins, surface screws, extra rail slots or expensive materials.

## Compatibility and release
Same six modular part IDs, fixed stock=-15 X, muzzle=22 X, magazine Y=-2.98,
20-round magazine slanted heel, user saves, pose/hand contacts and ballistics.
No render-loop mesh work. Still 25 exterior scene meshes, no new external family.
Old P2/P3/P4 invariants updated only where the *art directions* changed.
Compare monochrome AND shaded against same-scale M4 and G3 at Arsenal/mobile
view sizes. Browser screenshot presence alone is not artistic approval.
Merge only after focused + repository CI passes and Pages release queue clears.
