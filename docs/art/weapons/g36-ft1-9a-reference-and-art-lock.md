# FT1.9A — Original Bundeswehr G36: reference and art lock

**State:** A complete: reference-led candidate and production contract; B visual acceptance remains pending.
**Version:** 2026-11-16. **Family decision:** G36 / future G36K / G36C requested by project owner.
**Immediate scope:** *original-pattern, full-length Bundeswehr G36* with factory carrying handle/dual optical sight, extended polymer stock, long handguard and factory polymer 30-round magazine.
**Art authority:** [Universal Weapon Art & Production Standard](weapon-production-standard.md).

## Source-backed reference ledger

| Evidence | Reference and finding | Use / confidence |
|---|---|---|
| Bundeswehr institutional overview | [Bundeswehr G36 equipment](https://www.bundeswehr.de/de/ausruestung-technik-bundeswehr/ausruestung-bewaffnung/gewehr-g36): translucent 30-round magazine, service equipment; later updates also described | High for service identity; **not** a frozen 1997 side-profile |
| Historical Bundeswehr data | [G36 service data sheet, July 2003](https://berufseinstieg-bundeswehr.de/wp-content/uploads/2019/01/Datenblatt-G36.pdf): introduced 1997, standard 480 mm barrel, folding shoulder stock, 30-round translucent composite magazines, standard carrying handle | High for dated early service envelope |
| Original HK period product art | [HK military/LE catalog, 2005](https://s3.amazonaws.com/hk-manuals/files/Catalogs/Military/HK_Military_LE_Catalog_2005.pdf), G36 factory side photo, page labeled 24; black polymer receiver/stock/handguard, tall upper, curved translucent magazine, long exposed barrel | High for 2000s silhouette; ensure photographed option matches chosen dual-sight version |
| Original dual sight manufacturer | [HK G36/SL8 dual sight instructions](https://s3.amazonaws.com/hk-manuals/files/Military/G36/G36_Dual_Optic_Sighting_System.pdf): polymer handle contains lower magnified optic plus upper reflex; German military issued this combination | High for specific twin-optic architecture |
| HK cross-family | [HK G36 technical data](https://s3.amazonaws.com/hk-manuals/files/Military/G36/G36_Technical_Data.pdf): rifle/K/C family comparisons, detachable top options, polymer stock and handguard forms | High for shared-family *relationships*, but depicted railed accessory options may be later than early Bundeswehr baseline |
| HK component/provenance | [G36/SL8 family armorer overview](https://s3.amazonaws.com/hk-manuals/files/Armorer/G36/HK_G36-SL8_Family_Armorers_Manual.pdf): polymer receiver, grip, handguard, buttstock; semi-transparent magazine; sight sits in handle | High for visible material identities; ignore internal fabrication/mechanical instructions |
| Fieldwork actual peer art | `fal-5000`, `fnc-service`, `hk-g3a3`, `ar-m16a2`, `ar-m4a1`, `ak-akm` from production geometry builder | High for current *game-style* comparison; do not confuse game art with firearm sources |

**Source restrictions:** Record URLs and observations only; do not commit third-party reference photographs. Do not equate newer railed HK product images with this specific period factory default. No unverified front/top measurement becomes a claimed mechanical specification.

## Exact visual ID and exclusion

**Must recognize in monochrome:** (1) open long handle; (2) lower optical housing + upper reflex unit; (3) broad molded polymer receiver with distinctive top shoulder; (4) long faceted/vented polymer fore-end; (5) polymer sidefolder with dominant rear opening and smaller structural opening; (6) separately angled grip and curved polymer 30-rd magazine; (7) exposed slim front barrel and modest muzzle.

**Do not borrow:** G3 stamped shell/cocking tube; FNC tubular folding stock; M16 A-frame/carry-handle housing; AR STANAG/AK magazine curve; G36C low rail; G36K short fore-end; modern rail and accessory clutter; later A2 modernization optics. Strong G36 family resemblance must come from common original-pattern geometry.

## Preliminary **game-art** coordinate contract

All datums are representational, non-engineering local art units; +X muzzle, +Y up, Z depth. B may revise a datum only with a reference-supported paired visual and the corresponding test update.

| Landmark | FT1.9B draft |
|---|---:|
| Stock rear | X -15.05 |
| Stock hinge / receiver back | X -6.80 |
| Receiver front | X +4.00 |
| Handguard rear / full start / front | X +3.75 / +4.15 / +13.45 |
| Magazine insertion center / top | X +0.45 / Y -2.85 |
| Barrel axis | Y 0 |
| Factory muzzle tip | X +19.50 |
| Total full-length span | 34.55 |
| Upper receiver roof | around Y +1.5 |
| Handle frame roof | around Y +3.9 |
| Optic/reflex top | around Y +5.6 (provisional) |
| Receiver lower/magwell lip | around Y -3.35 |
| Fore-end vertical envelope | around Y +1.3 to -2.1 |

**Do not derive absolute 3D art units from manufacturer mm.** The full-length model is comparable to the FNC family in weapon-local game scale; K/C later get separately authored geometry and body proportions.

## Critical code ownership (main as reviewed 2026-11-16)

- Primitive repertoire: `src/weapons/geometry/profile-primitives.ts` — `addOutline`, `addCuboid`, `addBar`, `addFacetedTube`, `addProfileFrame`.
- Canonical live use: `src/breach-modular-weapon-geometry.ts` → `src/breach-weapon-geometry.ts`; initial B builder isolated from these via dedicated lab.
- Catalog/assembly authority: `src/equipment-weapon-families.ts`, `src/equipment-weapon-assemblies.ts`; **no G36 live preset yet**.
- Material authority: `src/weapons/geometry/weapon-material-registry.ts`; B uses a single unlit neutral material override (no new finish).
- Original G36 is an appearance project. G36K/C, Arsenal integration, inventory, ballistics, animation and issued faction references are post-B.

## B acceptance and sign-off boundary

1. Real G36 production-intended geometry with all six standard naming slots (not a stand-in bitmap, 2D silhouette or independent lab art).
2. Real seven-rifle equal-scale lab, actual side, three-quarter, opposite, top, front and 64/128px/mobile captures.
3. At least one truly open carrying-handle hole and two actual structural stock openings (not painted).
4. Connected stock/receiver/handguard/barrel/magwell; one G36-specific curved magazine silhouette.
5. Real emitted triangle/mesh audit; target 12–20 meshes and 250–400 triangles, soft review at >24 / >500.
6. Browser, test and compile evidence. **Human visual approval remains explicitly pending** until actual captures have been reviewed.
7. No edit to production presets, faction assignment, gameplay logic or main deployment.

**FT1.9A scope status:** reference direction and master selection locked. **FT1.9B scope status:** geometry and review must still be built and proven.
