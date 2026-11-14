# FN FAL 50.00 — Stage 1B caricature silhouette revision

**Baseline:** Stage 1A on the same feature branch. **Scope:** 50.00 blockout only. Main, Arsenal, gameplay, production and existing weapon assets remain unchanged.
**Design brief:** chunky, stubby, iconic, exaggerated, authentic, representational; recognizably a FAL using as little geometry as possible.

## Revision intent

The original S1A matched the G3A3 too closely because both read as a long receiver slab, flat fixed stock, box magazine and narrow fore-end. Stage 1B intentionally exaggerates **relationships**, not internal mechanism, added trim or micro-detail.

The **same 12-mesh default** remains. The same exact -15.0 stock rear X, +22.0 muzzle X, 14.7 gas-block/sight center, 3.8–14.1 handguard X, magazine and barrel length are preserved. The firearm remains a full-length battle rifle beside the M4A1 and G3A3.

## Exact component deltas (local art units)

| Component | S1A | S1B | Recognition purpose |
| --- | --- | --- | --- |
| Fixed stock crest | Max Y 1.17 | Max Y **1.99**, highest at X -9.30 | Distinct humpback rather than flat G3 wedge |
| Fixed stock heel | Minimum Y -3.38 | Minimum Y **-3.73** | Strong downward sweep and broad caricatured butt |
| Fixed stock vertices | 9 | 11 | One contour, no new mesh |
| Receiver top | Long flat Y 1.81 | Y **1.86** with intentional shallow forward step at X 0.88–3.06 | Break generic slab shape without adding receiver ornament |
| Grip heel | S1A min X -5.48, min Y -6.53 | S1B min X **-6.87**, min Y **-7.14** | Pronounced rearward rake, visible grip/mag negative space |
| Handguard upper | Max Y 1.40 | Max Y **1.67**, fuller rear shoulder | Front furniture looks substantial |
| Handguard lower | Minimum Y -1.70 | Minimum Y **-2.22**, quickly tapers up at front | Bold triangular/wedge side silhouette, not an HK tube |
| Gas-block sight | Max Y 2.83 | Max Y **3.38**, clear two-ear V shape | Tall, open FAL sight rather than G3 ring |
| Rear sight | Max Y 2.73 | Max Y **3.00** | Low-poly aperture blade read in thumbnail |
| Magazine | S1A rectangular profile | **Unchanged** | Avoid arbitrary oversizing: mag is not a reliable discriminator from G3 |
| Muzzle and barrel | Full 7.3-unit exposed region after sight | **Unchanged** | Longer, exposed front barrel remains vital FAL signature |
| Carry handle | Optional, off by default | **Unchanged** | Silhouette cannot rely on it |

The FAL's conceptual **handguard triangularity** is silhouette taper from thick near the receiver to thin at the gas block, not a literal AR/M16A1 triangular cross-section.

## Geometry contract

Continue using `profile-primitives.ts` (low-vertex 2D extruded outlines, one cuboid pad, one six-sided barrel tube). The 50.00 has **12 visible meshes without the optional handle, 13 with it**. No added bore, screw, trigger, charging handle, ejection mark, rail, vent, stock seam or texture in this pass. The FAL should not be differentiated through color, material or scale manipulation.

All vertex positions now live in `src/weapons/geometry/fal-stage1-blockout.ts`. That file is authoritative; this document only records the visual contract and milestone deltas.

## Reference comparison

- **M4A1:** Short 14.5-inch rifle outline, straight buffer stock, A-frame near muzzle, rail; shorter in local X than either battle rifle
- **G3A3:** More uniform receiver / forward cocking tube, flatter stock, simpler tubular handguard, small far-forward ring sight
- **FAL 50.00:** More prominent stock swell/drop, more rear-raked grip, wedge fore-end, gas-block sight well behind muzzle, forward upper-cover step

Rough comparable model-local lengths: M4 32.65, G3 37.70, FAL 37.0. Keep the rifles' original scale in the lab; do not resize individual weapons to force the comparison.

## Tests and human gate

- `tests/weapon-fal-stage1-blockout.test.mjs` includes form, placement, mesh budget and cleanup assertions; the new S1B assertion confirms stock hump/drop, grip rake, triangular fore-end and sight height.
- The lab page `/fal-stage1-lab.html` uses the actual existing weapon builders and the revised FAL builder in one neutral material.
- **Visual approval still required** from a running Three.js preview; the standalone 2D source-coordinate comparative PNG is not a live browser screenshot.
- Inspect in side and 3/4 angles; require G3 distinction at normal two-column Arsenal thumbnail size.
- If still too G3-like, adjust the **receiver/stock relationship first**. Do not solve it by adding mechanical detail.

## Stage 1B complete when

1. The revised branch compiles and the focused test passes in an environment with the project dependencies.
2. The new FAL renders without bounds errors, clipping or seams at side and 3/4 views.
3. The FAL is recognized independently of the carry handle, finish and labels.
4. M4/G3 source families remain unchanged.
5. Human visual review approves the exaggeration before any live Arsenal integration.

No merge or production deployment is authorized by this stage alone.
