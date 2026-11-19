# R870 P10 — iconic shape first / mesh reduction
**Decision:** Replaces P09's over-articulated Police Wood surfaces with stronger primitive forms at gameplay distance. The 870 should feel like a recognizable toy-scale 870, not a small simulation mesh. Derived from the user's actual P09 Arsenal side and three-quarter screenshots and traditional 870 Police wood-stock reference discussion.

## Exact model changes (art coordinates, +X forward, +Y up)
- **Stock:** rear wood face at x=-15.26; butt pad runs back to x=-15.78 and is .54 x-units thick (previously .34). Broad 8-vertex butt/comb + matching 10-vertex wrist profile, same 3.22 depth. Wrist leaves receiver x=-6.12, drops sharply through (-7.07,-3.10), then sweeps slightly rearward/down through (-8.43,-3.72) into the stock heel. Calmer comb, no small decorative ridges.
- **Receiver:** one 9-point, 3.48-deep, externally crowned steel mass. Upper rear shoulders and a visibly angled front nose remove the cuboid look. No duplicate steel side skins, lower edge band, micro-lining, action bars or bolt insert.
- **Ejection opening:** ONE larger 6-vertex matte-dark visual opening, right (+Z) only, moved upward (y=.26..1.06). 0.055-deep side applique, with no inner rim, inset or real extruded hole. Treat this as readable graphic negative space; not a machining demonstration.
- **Pump:** four stations at x=2.65/3.08/10.97/11.50; six-sided hex cross section. From x3.08 to10.97, side width stays exactly ±2.03, with only small short end chamfers ±1.86. Y top=-.21 and bottom=-3.23 along the long straight center. Four dark 0.38-wide channels per side, 9 named pump meshes total, no tiny fasteners. Unlike P09's 6-station 8-sided inflated pump, this is a rigid low-facet sleeve.
- **Barrel:** SIX facets retained but radius .80→.96; muzzle x=19.20 and shooting axis y=.94 unchanged. Barrel still extends 4.77 art units beyond the fixed tube cap.
- **Fixed tube:** six faces and radius .68→.80, center y=-1.04 rather than -.84. End cap radius .86, six faces, no cube. Tube stays fixed during all shotgun reloads; it is an Arsenal visual slot, not a detachable ammo device.
- **Front sight:** one oversized simple metal post (width .50, height .55, depth .52), y=2.13 near x=18.78. Intentionally graphic/game-readable rather than literal bead scale.
- **Pose datum:** exact saved stockX=-15.78, muzzleX=19.20, muzzleY=.94, shotgun shell reload and six-slot preset stay unchanged; underhand pump support palm is now -3.38 to clear the larger flat sleeve.

## Acceptance (no artistic loopholes)
1. P10 side view identifies stock wrist's **down then rear/down** silhouette, crowned receiver, flat high port, two heavy tubes and raised sight at gameplay/mobile scale.
2. Three-quarter views show a rigid **six-plane** pump and two distinct six-face metal cylinders, not a pill or squared-off stick.
3. No z-fighting/flickering micro-edge seams, inner port bolt, second receiver skin, or action-bar lines.
4. No change to `r870-police-wood`, the six named part identities, saves, bullet/shotgun physics, fixed tube and shell reload.
5. Keep the existing P07/P08/P09 compatibility regressions and run the P10 art verification through Arsenal M3.0 critical and actual 3-view WebGL screenshot; inspect silhouette at 100% mobile zoom.
6. Future Mossberg 500 must have independent receiver, stock and pump shape landmarks; no copying this mesh and changing the name.

**Status:** P10 feature branch until reviewed and merged. These are intentionally game art dimensions rather than real firearm manufacturing dimensions.
