# FN FAL P11–P13 family — implementation record

The approved FN FAL 50.00 P10 silhouette is the **immutable art baseline**.
No geometry, proportions, stock neck, receiver, magazine or vent geometry is
changed for the original preset.

## P11: wooden 50.00
- New part IDs `fal-fixed-wood`, `fal-vented-wood` and optional `fal-grip-wood`.
- The fixed wood stock and handguard reuse the **same meshes** as the P10
  polymer FAL; no grain geometry, tiny screws or new chamfers.
- Reuse approved `HK_WOOD` color identity. Factory keeps dark polymer grip
  and handle; optional wood grip is selectable in Workbench.
- Factory reference `fal-5000-classic`, standard 21-inch barrel.

## P12: 50.61 Para
- `fal-para-folder` is visually the **extended** side-folding Para stock:
  upper rail, lower rail, short supporting brace, oversized hinge and
  rectangular buttplate, with truly open silhouette.
- Five low-poly solids, no model-only complexity added to the original.
- Shoulder contact X stays -15 for existing pose solver.
- Para models omit the 50.00 carry handle, have a low Para sight and a
  simplified compact/folded charging-handle shape.
- Factory `fal-5061` retains full 21-inch muzzle and polymer fore-end.
- Folding **animation** or visually folded state is deliberately out of scope
  here; there is no folding-stock mechanic.

## P13: 50.63 Para
- `fal-172-para` barrel art uses nominal 17.2-inch length, game-art muzzle
  X=19.40 (compared with standard X=22.00).
- Standard FAL handguard stays full-length and identical; only exposed
  barrel, collar, combination-device mesh and port marks move by -2.60.
- `falBarrelArt` drives both visual tip and existing shot/muzzle presentation
  via `resolveWeaponAssembly`; optional muzzle attachments still use the
  same datum, and the no-factory-muzzle geometry reaches the new tip.
- The FAL compatibility rule explicitly allows the long vented fore-end with
  the mid-length Para barrel. Other weapon families retain their existing
  strict barrel/handguard length matching.
- Factory reference `fal-5063`.

## Verification gates
- Four distinct factory preset IDs, all valid, readable and serializable.
- P10 factory stays at existing mesh/triangle count and positions.
- Wood has exactly the original fixed geometry and uses wood materials only
  on selected furniture.
- Para stocks retain negative space with <=28 visible meshes and <450
  triangles, preserve stock contact, and omit the carry handle.
- For 50.63 visible muzzle bounds, rifle muzzle pose, presentation socket
  and short `falBarrelArt` must agree.
- Browser captures: original comparison lab plus new Arsenal 50.00 wood,
  50.61 and 50.63, including an actual mobile Workbench rendering.
