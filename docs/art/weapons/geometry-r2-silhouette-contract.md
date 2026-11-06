# Fieldwork Breach — Weapon silhouette rebuild (R2)

This is an **art / game-geometry** specification, not a fabrication drawing. No real-world internal mechanisms, machining, or assembly instructions. External reference sizes provide comparative visual proportions only; the existing combat resolver owns the gameplay muzzle, hands, stock and ammunition.

## Reference index and orthographic evidence

| Family | Reference / provenance | What to compare |
|---|---|---|
| M16A1 / CAR-15 | [Smithsonian museum M16A1 collection](https://americanhistory.si.edu/collections/object/nmah_1173785); [Colt historical catalog](https://www.colt.com/wp-content/uploads/2023/02/m16a2carbinecommando9mmsmgm4carbine.pdf) | Carry-handle *opening*, triangular versus shortened furniture, taper of fixed vs sliding stock |
| M16A4 | [US Army M16A4](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M16A4-Rifle/) | Flat receiver + long rail + fixed stock. Official overall 39.6 in |
| M4A1 | [US Army M4A1](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SL-Portfolio/M4A1-Carbine/) | Short carbine fore-end and telescoping stock. Official overall 29.75–33 in |
| Mk 18 | [Daniel Defense RIS II](https://danieldefense.com/government/mk18-risii-fde-gov.html) | Very short nose, broad uninterrupted rail, dense compact silhouette. Exterior RIS II length 9.55 in |
| AK-74 family | [Small Arms Survey AK-74 identification sheet](https://www.smallarmssurvey.org/sites/default/files/SAS-weapons-assault-rifles-Kalashnikov-AK-74.pdf) | Magazine outline, wood/polymer contrast, classic sight / fore-end roof |
| AK-100 family | [Small Arms Survey AK-100 identification sheet](https://www.smallarmssurvey.org/sites/default/files/SAS-weapons-assault-rifles-AK-100-series.pdf) | AK-103 full-length 943 mm vs AK-105 compact 824 mm: *relative silhouettes only* |
| AKS-74U | [Tula museum collection](https://heroes-arms.ru/en/aks.html) | Raised upper/rear shape, skeletal stock, short fore-end and iconic chunky front |

Capture linked side, top and front reference photos (with author, date and source URL, not copied binary media) for each of the 11 presets in the asset review. Orthographic views are generated *from the actual game meshes*, not recreated independently. Mark absent views as missing evidence, not as measured facts.

## Silhouette acceptance contract

- Geometry is symbolic: confident chunky 2D outline extruded into a small number of 3D prisms, no fasteners or micro-grooves.
- Priority: side contour > top/front depth > high-value negative spaces > material identity.
- A profile uses 4–10 outline corners, at most a small number of big protrusions. Use a single tapered profile rather than a staircase of boxes.
- AR carry handles and AK skeletal stocks must preserve silhouette negative space.
- The 7.62 AK magazine is visibly more curved than the 5.45 magazine in unlit grayscale. No reliance on wood/polymer colors.
- Every family gun ends at *local X=19.5*, matching the existing muzzle/contact contract. The real in-game relative length still comes from `resolveWeaponAssembly().lengthScale` at the operator rig; do not independently rescale 3D meshes.
- Mesh count goal **12–28** (subject to exceptional silhouettes). No allocations in the render loop.
- The workbench, dropped weapon, rig and Campaign kit preview must all use `buildWeaponSilhouette` and share part IDs.
- A compact still needs *body shape* differences (fore-end shorter, denser receiver and forward furniture), even with lengthScale.

## Orthographic review requirements

- Side: opaque white/black silhouette with stock at left and muzzle at right, all 11 presets on one common baseline.
- Top: check broad rail/handguard/furniture envelopes; no accidental face-thin prisms.
- Front: check believable broad, chunky silhouettes; no floaters or mismatched depth.
- Three-quarter: wood/resin/polymer contrast, silhouette breaks and physically joined solids.
- Gameplay thumbnails: 64px, 128px, and normal mobile workbench size; if details vanish in the 64px thumbnail, remove them.
- Four cornerstones first: M16A1, Mk 18, AKM, AKS-74U. Differentiate the remaining seven by shared legitimate parts, not invented clutter.

## Delivery stages

A. Inventory, visual contract, reference index and baseline tests.
B. Reusable extruded profile primitive; scoped change to procedural exterior meshes.
C. AR exterior shape family: fixed / sliding stocks, carry-handle opening, triangular/rail fore-ends and short Mk 18.
D. AK exterior shape family: tapered/solid/skeletal stocks, raised dust-cover silhouette, distinct 7.62 vs 5.45 magazines, compact Krinkov.
E. Integrate socket position / auto-fit and revise silhouette and budget tests.
F. Orthographic / regression audit, then one release checkpoint only if green and prior Pages publish verified.

**Not in scope:** ballistic simulation changes, functional weapon details, attachments inventory changes, new ammunition, direct firearm assembly guidance, or separate geometry per view.
