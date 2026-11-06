# AK R4.3 — reference-driven silhouette refinement

## Art contract
Stylized, chunky, stubby, legible first; every silhouette must identify its preset at phone-card size.
Use the existing six interchangeable exterior slots. Keep part IDs, save compatibility,
weapon classes, authoritative muzzle X=19.5 and handling/collision semantics unchanged.
Profile is XY, side-wall depth is Z. Preserve negative space in all skeletal stocks.
Keep geometry ≤ 28 meshes per gun; no new loops or frame allocations.

Reference prompts: AKM/AK-74 silhouettes and muzzle types in
[Small Arms Survey AKM](https://www.smallarmssurvey.org/sites/default/files/SAS-weapons-assault-rifles-Kalashnikov-AKM.pdf),
[Small Arms Survey AK-74](https://www.smallarmssurvey.org/sites/default/files/SAS-weapons-assault-rifles-Kalashnikov-AK-74.pdf),
[Small Arms Survey AK-100](https://www.smallarmssurvey.org/sites/default/files/SAS-weapons-assault-rifles-AK-100-series.pdf),
and [ARES AK-103 analysis](https://armamentresearch.com/wp-content/uploads/2016/03/ARES-Research-Report-No.-5-A-Tale-of-Two-Rifles.pdf).
Compare orthographic silhouettes, not internal firearm workings.

## Shared exterior geometry
- Standard AK fore-end extends to X=12.45 rather than 15.1, showing a clear length
  of exposed slim barrel after furniture. AK-105 mid-length guard ends X=12.3,
  RPK-74 support handguard X=13.35, AKS-74U stays X=11.45.
- Butt, grip, receiver and magazine remain in one attached silhouette. Move AK visual
  grip contour rearward by 0.75 game units (gripShiftX -1.3 → -2.05);
  do not change primary weapon gameplay sockets.
- 7.62 magazine has a larger sweeping toe and strongly diagonal end edge.
  5.45 has a shorter, subtler sweep but equally obvious end tilt. RPK-74 uses a
  longer 45-round profile with more pronounced lower-toe slant.
- Keep top lines simple; emphasize the profile with six-to-eight polygon corners.
  No modeled internal parts, micro detail or separate material textures.

## Preset checkpoints
| Preset | Primary silhouette identity |
| --- | --- |
| AKM | Broad classic fixed butt, abbreviated wood handguard, curved 7.62 steel mag, short slanted muzzle |
| AKMS | Two narrow underfolding struts with descending lower fork and turn-down butt; no triangular brace |
| AK-74 | AK-74 butt/cheek, wood guard, subtler 5.45 curve, longer/thicker 74-style cylindrical brake |
| AKS-74 | Tall open side-fold triangle with clear uninterrupted interior gap; otherwise AK-74 front |
| AK-74M | Refined original solid polymer sidefolder, black fore-end, AK-74 muzzle silhouette |
| RPK-74 | Bespoke deep-heeled clubfoot, extra fore-end, visible exposed barrel, forward sight, folded bipod, deep 45-round mag |
| AK-103 | Shared 74M polymer stock, pronounced 7.62 curve; **requested** slanted AKM-look tip as a custom aesthetic |
| AKS-74U | Preserve short wood guard, large front booster and compact stock; tilt 5.45 magazine; lower cover-mounted rear sight so it is not mistaken for a holographic sight |
| AK-105 | 74M-style solid sidefolder, compact mid handguard, distinct short 100-series cylindrical brake and 5.45 mag |

## Authenticity note
The requested AK-103 slanted AKM-style tip is **not a canonical factory AK-103**.
A standard full-length AK-103 shares the AK-74M/100-series muzzle brake,
while the AK-105 uses a shorter carbine device. Treat the slant as an
appearance choice pending a factory-versus-custom preset split. Do not
describe that AK-103 look as factory issue.

## Acceptance
- In nine side-view thumbnails, no two folding stock families are confused.
- The AKMS reads as an underfolder, AKS-74 as a triangle sidefolder, RPK-74 as
  a support rifle, and AKS-74U as a compact rifle from their outer contour alone.
- Fore-end, hand and grip parts overlap correct receiver envelopes; magazine toes
  slant visibly. Keep AKS-74U's open stock gap.
- The end of each assembled visual stays at the authoritative muzzle.
- Only a focused group of family, geometry, and existing visual contract tests
  runs in PR CI; visual side-profile inspection remains the release gate.
- Release only after visual approval; do not merge if another Pages deployment
  is queued or failing.
