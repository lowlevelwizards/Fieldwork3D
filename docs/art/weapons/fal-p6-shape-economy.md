# FAL P6 — Shape economy and silhouette hierarchy

## Why
At the end of P5 the factory FAL emitted **686 real rendered triangles across 25 meshes**.
Measured nearest-neighbor live defaults (same builder, no guessed modeling tool stats):
G3A3 490 / 24 meshes; M4A1 478 / 31; M16A2 466 / 26; AKM 352 / 24.
The FAL receiver alone emitted 378 triangles. P6 is removal, not ornament.

## Stages and art decisions
- P6A: create scripts/audit-weapon-geometry.mjs, tally index/position triangles,
  vertices, mesh objects, parts. Keep repeatable audit on every FAL PR.
- P6B: remove two unnecessary longitudinal sections and redundant bottom
  bevel corners from receiver crown. Four six-point sections replace six
  eight-point sections: 96 -> 48 triangles. Preserve central roof half-width
  0.67 and maximum shoulder half-width 1.85.
- P6C: raise/deepen the handguard from 3.14 to 4.04 model units at rear
  shoulder (+29% height), eliminate bottom bevel corners (64 -> 48 shell
  triangles). Keep only three four-corner vents per side, not hexagon cutouts.
- P6D: refit fixed stock with long level comb and controlled lower sweep;
  reduce its pad height to 4.32, preserve X=-15 contact. Consolidate lower
  receiver's 12-point uneven plate to seven purposeful corners and reduce
  magwell, grip, trigger guard, carry grip, charging plates, sight ears,
  muzzle and pivot to their essential faces.
- Ejection port: right side a surface-projected rectangular quad, not a
  complex high scallop or floating decoration.
- P6E: run focused regression, actual triangle comparison, WebGL right/left/
  quarter/mobile screenshot capture, checks and production build.
  
No gameplay/simulation changes, no new part IDs, same magazine heel and
weapon attachment anchors. The screenshot comparison must validate the
stock profile and handguard height: passing numeric tests is insufficient.
Do not merge just because CI is green if art looks broken.