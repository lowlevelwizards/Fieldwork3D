# FN FAL P9 — alignment, finish distribution and studio parity
P8 baseline: 366 emitted triangles / 26 real meshes, with a settled flat
triangular upper and handguard. **Keep those principal shapes.**

## Alignment and geometry (P9A)
- Integrated lower lip extends backward at Y=-3.19 from X=-.10 to -1.10.
- FAL 20-round magazine (and existing two ribs) shifts rearward by .35 in X:
  center 1.35 -> 1.00, original width 3.78 and Z thickness 1.62 retained.
  Carried mag geometry recenters from this same constant. Tactical reload
  sockets and authoritative firing/stock pose X remain unchanged.
- Circle pivot on each side moves back X=-1.14 -> -2.05, staying behind
  magazine left edge X=-.89.
- Right port remains a flat quad on the sloping receiver face; rear edge
  advances rearward from X=.14 to -.80, front edge remains X=2.64.
- Dark rectangular receiver/handguard bridge keeps 1.30 X length, reduces
  Z thickness 2.46 -> 2.16, increases Y height 2.30 -> 2.55.
- Rear sight is a single seated rectangular blade, Y 1.405..2.955,
  Z width .90 instead of 1.58, without a loose floating base.
- Front sight ears move inward on both sides Z +/-1.04 -> +/-.73.
- Stock extends its lower heel Y -4.09 -> -4.81, an increase of
  15% in overall silhouette height, preserving the exact upper contour
  and the narrow side thickness. Matching pad 4.26 -> 4.98.
- Grip uses the same four points, shifted rearward only at the bottom.

## Palette audit (P9B)
Compared factory weapon material slots:
| Slot | FN P8 | Nearest neighbor | Decision |
|---|---|---|---|
| Receiver steel | #414844 | AR #414A44 / AK #454B43 | retain |
| Polymer furniture | #343D37 | AR #343E37 / AK #354038 | retain |
| Lower | #353D39 | HK dark polymer #303433 | retain readable contrast |
| Bridge | #2A312E | HK blackened muzzle #2F3533 | retain deliberately dark steel |
| Magazine | #515A54 | G3 #505757 | share G3 steel |
| Magazine ribs | #3F4A42 | AR rib #526054 / HK rib #353D39 | neutralize to #404847 |
| Muzzle | inherited receiver steel | HK blackened steel #2F3533 | share HK muzzle metal |
| Muzzle slots | polymer vent role | blackened steel opening | distinct dark steel slot |

No recolors of generic AR/AK/HK, no new user-facing finish IDs or
saved recipe migrations. Shared standalone static materials only.

## Arsenal lighting (P9C)
Arsenal fullscreen Workbench and Gallery thumbnailer share
`addArsenalInspectionLighting`; both now use the approved gameplay
graphic key and fill: key 2.35 along `STUDIO_KEY_DIRECTION`,
hemi 1.20 with plum-plus ground, plum-plus side fill .60, same renderer
ACES/sRGB/exposure already shared. Background remains #182824, and
there is no Lighting Lab, mutable toggle or additional shadow pass.

## Verification
- Strict names/part identifiers and stable shot muzzle X=22/stock X=-15.
- A single low-poly bridge, two-ear front post, seated rear blade, no trigger guard.
- Continuous mag/rib motion and grounded visual port vs unchanged real sockets.
- Numeric palette/color role parity and the exact lighting rig.
- Emitted triangle budget + shaded side/quarter/mobile browser captures.
- Required main CI, merge only at a cleared verified Pages checkpoint, and
  verify the public Pages build stamp after deployment.
