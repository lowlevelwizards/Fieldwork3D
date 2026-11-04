# RIG-R7 — grounded silhouette, mounting, magazines and color audit (2026-11-04)

## The accepted visual direction
The 46560228 rig-pressure release has been reviewed on an actual iPhone. Keep the collar-over-harness overlap, worn-in pockets and chunky symbolic voxel proportions. The remaining challenge is *topologically complete* front shoulder terminations and faithfully differentiated load-bearing families. No hidden rig geometry should determine actual bullet inventory or protection.

### Reference comparisons (original vs commercial, no 1:1 measurements)

| Model (internal style) | Iconic default | Distinctive high-contrast silhouette | Ammo pocket truth | Reference |
|---|---|---|---|---|
| Micro chest rig (`micro-rig`) | Ranger Green | Small twin-cell high chest chassis, small side wings, compact H/X support | 2 primary cells plus wing positions, show issued magazines | [Spiritus MkV](https://www.spiritussystems.com/micro-fight-chassis-mkv/) |
| Classic four-cell X harness (`light-rig`) | OD Green | Four large equal front flapped magazine cells; visible rear X and side ties | Four magazine cells, no decorative fifth | [classic chest rig examples / Type 56 comparison](https://kommandostore.com/products/chicom-type-56-ak-chest-rig) |
| Three-mag placard (`chest-placard`) | Coyote | Narrow modern modular flat panel with 3 individual magazine positions and two *real* carrier taps | 3 cells; plates remove independent straps | [Crye convertible attachment](https://www.cryeprecision.com/AirLite-Convertible-Chest-Rig) |
| Type 56 canvas (`chicom-rig`) | Field Green | 3 notably tall square toggle-flap magazines, tiny side utility bags, narrow cotton straps | 3 front magazine slots; side packs are NOT magazines | [genuine Type 56](https://kommandostore.com/products/chicom-type-56-ak-chest-rig) |
| Minimal bandolier (`bandolier`) | Khaki | One strong diagonal with separate descending pockets; never symmetrical H | 4 visible magazine cells, fifth is utility only | Generic canvas bandoliers, *not* a P83 |
| Split-front MAV (`split-front`) | MultiCam | Two clearly separated MOLLE panels, two bridging clips and larger flank wings | 4 primary cells, center gap must remain clear | [Tactical Tailor two-piece](https://www.midwayusa.com/product/3298150317) |
| Full patrol bib (`full-chest`) | Forest Green | High continuous administrator shelf above four low cargo cells, wide upper taper | Four lower mag cells; upper shelf is utility | Larger modular patrol chest rigs |
| LBV-88-style (`lbv`) | M81 Woodland | Two vertically tapered vest front halves, open sternum, two-tier double ammo pouches, real rear yoke | 4 physical pouches with double-mag options | [USGI LBV-88](https://www.armynavywarehouse.com/product-page/gi-load-bearing-vest-lbv-88) |
| PLCE/field webbing (`field-webbing`) | Woodland DPM | Waist belt and lateral large pouches, Y support; NO high chest bib | Belt-attached double mag pouches and utility/canteen pockets | [PLCE photo](https://www.armyandoutdoors.com/products/british-plce-webbing-set) |
| P83 Battle Jacket (`sadf-webbing`) | Nutria Brown | Two high front chest towers, hip flank bulk, attached dual rear sustainment compartments | Double mag pouches remain distinct from canteens/rear bags | [KommandoStore P83](https://kommandostore.com/products/sadf-pattern-83-battle-jacket) |

**Distinctiveness standard:** phone-scale front/3/4/rear recognition with camouflage off. All large volumes have a purpose (magazine, canteen, admin, support, or sustainment). Thin micro-accessories must not substitute for silhouette.

## Exterior armor and rig compatibility

- **Bare and concealed** (`armor-bare`, `soft-slick`, `soft-paca`): the harness is standalone and fitted to the visible uniform. Concealed armor never becomes an external mounting platform.
- **Police soft, flak, legacy armor and slick plate**: standalone harness over the *actual exterior*; keep its shoulder routes clear of raised armor collars and respect its outer side panels.
- **Modular plates** (`plate-jpc`, `plate-standard`, `plate-heavy`): a genuine interchangeable chest chassis / placard (`micro-rig`, `chest-placard`) converts to direct front mounting and drops the long shoulder and rear harness. **Other** rigs remain external wraps; MOLLE does not magically convert a Chicom or P83 into a detachable placard.
- **Bulky over bulky** (P83/LBV/full bib over heavy/legacy): possible fictional fit but caution; never advertised as standard historical issue. Display with a caution rather than silently changing the combat loadout.
- **Compatibility is a wardrobe/geometry flag, NOT equipment ownership or statistics.** Saved looks can remain intact and a mismatched rig uses an external harness rather than a floating false quick-attach.

## Color evidence tiers and conservative rule

1. **Original issue / characteristic:** Type 56 solid green or khaki; P83 Nutria Brown; US LBV olive green and woodland; PLCE OD/DPM. These must be iconic default appearances and their exact original silhouettes.
2. **Documented commercial modern:** Crye convertible MultiCam, Coyote, Ranger Green, Black; modular nylon placards and split rigs in matching colors; tactical carriers in commercial MultiCam, black, Coyote, Ranger Green and documented national service patterns.
3. **Plausible reproductions:** some colors for old chassis beyond original issue; permitted as *creative alternate* but not described as historically issued.
4. **Unverified/historically wrong:** no default camouflage on original Chicom or SADF P83. No blanket allowance for all 30 patterns on every rig or vest.

Solids by actual item and camouflage print whitelists are codified in `src/operator-rig-authenticity-policy.ts`; the existing camouflage masters remain unchanged. The palette adds a dedicated **Nutria Brown** rather than using modern Coyote to misrepresent P83.

### Magazine contract
For every rig, `magazineCarryLocations` from the actual equipment ledger determines **how many physical magazines are visible**. A patterned bag or false outline must not create extra magazines. One physical magazine must have an assigned real pouch/cell; double-cell rigs may show two only when present. The last utility pouch on the bandolier is *not* an invented fifth mag. Weapon-specific magazine proportions are a future separate effort.

## Release gate
Check 5 tops x 9 armor styles x 10 rigs programmatically and record geometry-only conservative warnings for bulky combinations, but capture ~10 *targeted* phone angles instead of hundreds of videos. Test cover/placard mode, shoulder/bib continuity, distinct default palette, real mags and restore-on-unequip. Gate with build and focused tests. No equipment economy, IK, or collisions touched.
