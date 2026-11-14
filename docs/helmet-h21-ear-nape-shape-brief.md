# H21 — Ear Relief Is Not Nape Clearance

## Visual brief

The iPhone H20 side-orthographic screenshots show that **Mid-Cut and High-Cut expose the ears**, but their rear side panels still terminate too high. A cut should clear the *ear*, not lift the *entire helmet hem*. Preserve the existing blocky, faceted crown and each approved front/ear cut. Restore a broad protected rear skirt that hangs down behind the ear without adding independent plates.

These are stylized head-local model coordinates, not manufacturer's dimensions.

### Per-cut checklist

| Station/constraint | Full-Cut MICH 2000 / ACH | Mid-Cut MICH 2002 | High-Cut MICH 2001 |
|---|---|---|---|
| Brow / temple | **KEEP** Y4.40 | **KEEP** Y4.55 | **KEEP** Y4.55 |
| Ear portion | **KEEP** Y2.04, Z−2.42→+1.45 | **KEEP** Y3.06, Z−2.18→+1.38 | **KEEP** Y5.30, Z−2.15→+1.75 |
| Rear transition | **KEEP** Z+3.00 | **MOVE** Z+3.05→+2.85 | **MOVE** Z+3.35→+3.05 |
| Rear / nape height | **KEEP** Y2.72 | **LOWER** Y3.82→2.92 | **LOWER** Y3.90→3.12 |
| Rear outermost Z | **KEEP** +5.60 | **KEEP** +5.75 | **KEEP** +5.66 |
| Crown, bevel, silhouette X | **KEEP** | **KEEP** | **KEEP** |
| Rubber lip / cover | Follows unchanged hem | Same shared hem, no plate additions | Same shared hem, no independent flange |

### Design constraints

1. **Full-Cut:** It is the anchor: deep ear coverage and lowest nape (Y2.72). Its contour, fitting envelope, straps, crown, rim and cover are not changed.
2. **Mid-Cut:** Ear remains exactly Y3.06. Only the last two rear hem points descend to Y2.92. The rear now sits slightly below the ear cut, closer to Full-Cut's protected nape. Start rear run at Z2.85 so it has visible breadth instead of a tiny dangling tail.
3. **High-Cut:** Keep the strongly carved Y5.30 over-ear arch. Descend from its rear edge toward Y3.12 at Z3.05, then hold that protection all the way to the rear at Z5.66. The ear is still visibly open; the back of the skull stays shielded.
4. **Do not** raise/lower the crown, add points to the side outline, round the top, rebuild accessories, or recreate overlapping ear/rear cuboids.
5. Keep all three designs on their existing **six-point unified contour** (29 quads / 58 triangles, one shell draw). No additional per-frame calculations or physics.
6. **Fit and accessory coherence:** derive edge binding and fabric cover from the same six-point array. Rear screw is approximately 0.55 game units above its corresponding contour; the rear webbing begins just beneath the edge. The unchanged helmet rail/hardware mount metadata must not be unintentionally tied to the new nape depth.
7. **Mobile verification:** same camera height and scale, side and three-quarter, cover on/off, straps visible, ear zone and rear visible. Approve only when a High-Cut appears open above the ear *and* protective behind it; Mid-Cut shows partial ear coverage plus a substantial nape.

## Important distinction

The relative *ear height* spread is large: Full 2.04, Mid 3.06, High 5.30. The rear nape heights intentionally cluster: Full 2.72, Mid 2.92, High 3.12. These are **not cut-down versions of a helmet with a uniformly raised bottom**.

This changes only the Mid/High lower silhouette and its rear-dependent fitting/strap positions. It does not modify PASGT or FAST or replace H20's historical side-profile documentation.

## Validation gate

- Six monotonic front→rear Z stations; unchanged front four points for each cut.
- Mid/High rear skirts below the ear station (strict inequalities).
- Rear height ordering: Full 2.72 < Mid 2.92 < High 3.12, with all within .40 head-local units.
- Rear cover and binding aligned to the shell with unchanged trim thickness; rear strap hardware aligned and clear.
- No increase in shell triangle count or number of meshes; critical Ground Zero regressions, TS build and mobile Studio smoke pass before any release.

Feature branch only. Merge and deploy only at an explicit release checkpoint.
