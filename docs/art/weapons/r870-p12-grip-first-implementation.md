# R870 P12 — grip-first production geometry and rear furniture
**Status:** Production branch, pending visual approval. Source: the user's P10/P11 screenshots and supplied wood, pistol-grip and birdshead photographic references.
**Coordinate convention:** +X muzzle, +Y up, +Z ejection side; all positions in Fieldwork art units, not firearm machining dimensions.

## Architecture
The existing six-slot Arsenal schema remains. The `grip` part owns the receiver-to-hand silhouette; the `stock` part owns the rear shoulder extension when one is present. All variants share only the rear receiver interface, not one generic grip mesh. `src/weapons/geometry/r870-rear-p12.ts` is the single pure coordinate source for the renderer, compatibility and pose data.

| Rear selection | Grip ID | Stock ID | Rear X | Shoulder |
|---|---|---|---:|---|
| Full wood (original factory) | r870-police-wood-wrist | r870-police-wood-stock | -15.78 | Yes |
| Short wood | r870-police-wood-wrist | r870-short-wood-stock | -13.78 | Yes |
| Conventional pistol | r870-pistol-grip | r870-pistol-only | -10.96 | No |
| Birdshead | r870-birdshead-grip | r870-birdshead-only | -12.20 | No |

**P12 full wood** grip contour (11 points, top first): (-10.45,-.15),(-9.50,-.55),(-8.60,-.55),(-7.55,-.04),(-6.12,.76),(-6.12,-1.76),(-7.10,-1.85),(-7.90,-2.36),(-8.80,-3.04),(-9.55,-3.21),(-10.45,-3.10). Top descends **early** before expanding into the rear stock. No phantom hook.
**Stock extension:** 7 points: (-15.26,.34),(-13.25,.30),(-11.30,.05),(-10.45,-.15),(-10.45,-3.10),(-12.50,-3.60),(-15.26,-4.02). Butt pad retains X -15.78 and 0.54 length, without a grip/stock seam.
**Short wood:** exactly same grip geometry, shortened shoulder extension and pad at X -13.78.
**Pistol:** independently drafted 9-point steep down/back complete contour; no invisible stock body.
**Birdshead:** independently drafted 11-point long rearward sweep with rounded terminal; no invisible stock body.

## Systems
- Preserve `r870-police-wood` factory part IDs, save and Arsenal recipe schema version 2, unchanged muzzleX=19.2, muzzleY=.94, barrel radius, tube and 9 moving pump meshes.
- Plain barrel rear moves from X 2.53 to X .60 to seat within receiver, no new collar/rail/trigger-guard detail.
- `readWeaponFamilyBuild` tolerantly repairs invalid R870 stock/grip pairs by selected stock, while `validFamilyBuild` rejects mismatches. Interactive `proposeFamilyPartChange` switches companion rear part together.
- Stockless variants have independent rear extents and primary-hand targets, no `family-stock-*` mesh, no physical shoulder contact; use existing stockless handling and pose gates. They are game-art options in a simulation, not new shotgun classes or different feed mechanisms.
- Keep normal first-party material palette: walnut for wood/birdshead, dark polymer for pistol; no microsurface, safety screw, stippling, or unnecessary bevel.

## Validation
P12 focused tests and existing R870 baseline + Arsenal/TypeScript/build + Ground Zero checks. Visual gate: identical mobile side and ¾ camera, compare full wood against P10 and P11; independently inspect pistol and birdshead, verify no joint crack/z-fight, no buttplate on stockless; check barrel root actually occluded. Inspect operator gripping and shoulder behavior before authorizing new stockless campaign entries.
