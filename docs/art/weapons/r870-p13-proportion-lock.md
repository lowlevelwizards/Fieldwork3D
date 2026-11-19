# R870 P13 — final proportion and alignment polish
**Basis:** user's November 19 P12 Arsenal side, oblique and top-view screenshots; approved grip-first P12 silhouettes. No new silhouette embellishment, part ID, gameplay class, reload behavior or ammo changes.

## Exact art targets
- **Upper barrel:** visible six-face tube y=.94 → **.80** (−.14), x=.60 seated root unchanged, x=19.20 muzzle unchanged. The authoritative muzzle/shot-time y=.94 stays unchanged to avoid changing weapon gameplay. Confirm physical and visual muzzle are still close enough at gameplay scale.
- **Mag tube:** remains y=−1.04, radius .80; six-face cap unchanged. New center separation 1.84 exceeds the radii sum 1.76. No cylinder intersection.
- **P13 raised corncob:** four longitudinal stations, constant six-sided center, x=2.65/3.08/10.97/11.50. Main ±Z half width 2.03→**1.85**; ends 1.86→**1.70**; main top −.21→**−.04**, bottom −3.23→**−2.84**. Short end chamfers remain; no inflated pillow geometry. Eight grooves stay 16 total triangles/one mesh, retargeted to y−.78..−2.10, z±1.925, with pooled **0x503824** low-gloss dark walnut.
- **Stock top-view width:** both wooden full and short stock extension and common wood wrist depth 3.22→**2.90**. Polymer pistol grip depth **2.60** and birdshead grip depth **2.38**. Preserve exact P12 side-view polygons and receiver seam landmarks; no hidden caps or stockless shoulder pad.
- **Buttpad:** rear x stays −15.78 for full / −13.78 short, with longitudinal width .54→**.68** (front face advances). Pad depth 3.52→**3.12** so it remains wider than the slim 2.90 wood but not cartoonishly broad from above. Pad height unchanged.
- **Receiver:** nine points retained; two upper ridge Ys softened 1.80→**1.75** and 1.70→**1.66** for calmer crown. Flat six-point port grows vertically from .26..1.06 to **.10..1.18** with four triangles, still right only, no inset bolt, micro-lining or screws.
- **Front sight:** same single simple cuboid; center y 2.13→**2.00** to follow lower barrel, height .55→**.59** (+7%), front geometry remains six faces.
- **Underhand pose:** center y −3.38→**−3.11**, still below −2.84 pump bottom; preserve hand reach x range and short-stocking/pump travel.

## Hard acceptance
1. P12 side silhouette and grip-first curve unchanged; slimmer from top, birdshead visibly less plank-like.
2. Barrel visually seats in receiver and six-face magazine tube stays separate; ejection port is larger and reads at mobile zoom.
3. Pump remains rigid and straight-sided, slightly raised and slimmer; brown grooves remain readable but no gray-metal stripe effect.
4. Wood variants have thick butt pads without moving the stockX contact/save datum; stockless ones have no pad or phantom shoulder.
5. No more than 11 meshes and 260 triangles for the full wood model, old factory and rear option IDs work, and gameplay muzzle coordinates remain stable.
6. Critical Arsenal, Ground Zero and production/WebGL checks pass before merging. Preserve release checkpoint/Pages build verification.
