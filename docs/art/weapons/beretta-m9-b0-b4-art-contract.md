# Beretta 92/M9 — first Fieldwork 3D miniature (B0–B4)

**Status:** Art-only feature candidate. Human desktop/mobile WebGL review and exact-head CI are mandatory before main.
**Authority:** [Universal Weapon Art & Production Standard](weapon-production-standard.md) (2026-11-16).
**Comparison source:** live `GLOCK_G2_ART` + shared secondary Arsenal inspection camera, not a separate lookalike.

## Art direction / stop gates
Chunky, stubby, abstracted, simplified, oversized, iconic toy-like Fieldwork miniature. The most authentic family character with the least geometry.
Do not copy the approved 2D study literally: refine the barrel's exposed radius, shorten/strengthen the upper-to-frame proportions, angle the grip toward classic Beretta identity, and remove micro-control clutter.
Use **five signature relationships**: broad sculpted metal frame; genuinely open oval-ish trigger guard; unmistakable 92 open-top upper with visible barrel; rear hammer / beavertail; strong curved long grip (M9) versus straighter Vertec-style grip (M9A3).
Must distinguish in grayscale at 64/128px without explanatory labels. Avoid Glock generic slide, G19-style short grip, full upper slab, cosmetic fake upper gap, floating guard, tiny trigger, screws, or a decorative muzzle cylinder larger than the slide.
No production game-play or manufacturing/assembly information is implied.

## First variant budget
- `beretta-m9` / M9–92FS: classic dark finish, long exposed upper barrel, curved full-height backstrap, no accessory rail.
- `beretta-m9a3`: independently authored straight grip profile, railed dust cover, subtle factory coyote finish, longer protruding barrel.
- Compact, Centurion, Performance and 93R remain **out of scope**; no placeholders or variant scaling.
- Both are **visual Arsenal previews only**, never issued weapons, never silently mapped to a Glock or SMG loadout, no 9mm ammo/magazine/save authority added.

## Art landmark specification (symbolic visual units; +X muzzle, +Y up, +Z right)
| Datum | M9 | M9A3 |
|---|---:|---:|
| Upper slide rear X | -8.76 | -8.76 |
| Nominal slide nose X | +9.30 | +9.42 |
| Exposed barrel end X | +9.40 | +10.00 |
| Main upper lower/upper Y | +0.38 / +3.14 | same |
| Upper depth Z | 3.08 | 3.08 |
| Frame body depth Z | 2.72 | 2.72 |
| Grip heel Y | -8.65 | -8.56 |
| Grip rear X | -8.15 | -7.95 |
| Grip front X | -4.05 | -4.04 |
| Physical guard hole Y | -3.09 .. -1.64 | same |
| Sight line Y | +3.50 | +3.50 |
| Barrel center Y | +2.57 | +2.57 |

These are authored game-art datums, **not firearm dimensions**. The current G19 reference slide is -8.66..+8.30, nominal height +.21..+3.17, slide depth 3.20 and grip heel -7.65. M9 is longer with a more open upper and heavier grip/frame relationships rather than simply being a stretched Glock.

## Geometry plan and delivery
1. **B0 reference/peer lock.** Beretta classic M9 vs M9A3 side/quarter/top, genuine factory distinction, Glock G2.9 and MP5K native size, universal style standards. Human-approved direction: first-pass 2D study, **not final geometry**.
2. **B1 real geometry.** `beretta-m9-silhouettes.ts`: integrated profile frame with true guard aperture; rear slide roof; TWO separated forward slide rails without full-width top bridge; 6-facet exposed barrel, independent hammer, simple sights, one magazine floorplate; two broad grip panels; one batched rear-serration surface; M9A3 dust-cover rail. No per-frame material or geometry allocation. Stable family part names.
3. **B2 shared viewer.** Reuse existing demand-render `GlockViewport` camera, light, orbit, geometry lifecycle through dispatch that discriminates Glock vs Beretta. Preserve saved Glock IDs, recipes and issued equipment authority exactly.
4. **B3 Arsenal.** M9/M9A3 factory cards under BERETTA in the same secondary gallery, 3D thumbnail and three-quarter hero, art-only visual inspection modal; NO equipping or misleading editable Beretta build controls.
5. **B4 verify.** Focused tests for true guard hole, open-top negative space, independent variant geometry, actual geometry budget, source Glock parity, disposal and cross-family selection. `tsc`, build, desktop + mobile Arsenal screenshots and visual comparison. Approval checkpoint before any main release.

## Budgets / sign-off
- Initial review target **12–18 meshes**, **<=420 measured emitted triangles**. A more stringent 300-triangle stretch target applies only if authenticity and opening remain.
- Check side, opposite, top, front and quarter from one real 3D builder; inspect open top from above and grip angle from side. Confirm no floating parts/z-fighting, guard interiors visible, no hidden geometry waste.
- One shared preview renderer, cache and one-per-frame offscreen thumbnail queue. Preserve demand-render interaction; resource disposal must not dispose shared materials.
- Only focused tests and actual browser evidence can mark a stage verified. Passing geometry tests does not equal artistic sign-off.
- Merge/deploy only after exact-commit green checks and verified previous Pages deployment; do not add to an existing release queue.
