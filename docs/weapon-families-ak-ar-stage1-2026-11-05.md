# Weapon Families W1 — AK / AR modular appearances (2026-11-05)

## Goal
Two recognizable, lightweight weapon families assembled from bold cuboid modules, without cloning firing/IK systems or changing historical equipment defaults across all saves.

## Architecture
- Weapon gameplay classes remain carbine / smg / rifle / shotgun until a separate ballistics/ownership migration.
- A WeaponConfiguration may optionally contain a build with family AR or AK and parts: receiver, stock, grip, magazine, handguard, barrel.
- equipment-weapon-families.ts is pure data plus normalization, with no Three.js dependency.
- Existing optic, muzzle, foregrip, light, sling attachments remain authoritative. The old generic stock slot is factory default while a family stock is selected, preventing conflicting visible stocks.
- breach-modular-weapon-geometry.ts renders small authored boxes on configuration changes only, not in render ticks. Uses steel, polymer and a shared wood material.
- All models share legacy receiver-local muzzle tip x=19.5. Resolved assembly drives visible pose and shot/clearance geometry. Compact proportions use shared lengthScale.
- Operators, dropped weapons, the Campaign kit preview and workbench consume models through one existing buildWeaponSilhouette hook.
- Legacy version-1 configurations without a family still render original four silhouettes and retain stats.

## Authored AR presets
- M16A1 — full-length, carry-handle, triangular handguard, fixed stock, straight magazine appearance
- M16A4 — full-length flat-top, fixed stock, rifle handguard
- CAR-15 — compact early carbine, retro receiver and stock
- M4A1 — flat-top, standard carbine handguard, collapsible stock
- Mk 18 — flat-top, short barrel, compact rail and stock

## Authored AK presets
- AKM — stamped receiver, wood stock/handguard, 7.62-profile steel magazine
- AK-74 — full-length rifle, wood furniture, 5.45-profile magazine
- AK-74M — polymer side-folding family, 5.45-profile magazine
- AK-103 — modern silhouette, 7.62-profile magazine
- AKS-74U — compact receiver and handguard, side folding stock
- AK-105 — modern carbine, mid-length polymer front furniture

## Authenticity guardrails
- AR and AK family parts cannot be intermixed.
- Receiver and barrel choices respect the owned carbine/rifle gameplay class.
- 5.45 and 7.62 AK magazine **appearances** stay matched to their receivers; actual ammunition behavior is not yet changed.
- Handguard and barrel profile lengths must match; barrel changes choose a compatible handguard.
- Rail accessories on non-railed handguards and optics on unmodeled mount interfaces are rejected.
- Purchased attachments displaced by a family edit return to Campaign stock.
- Malformed saved builds normalize safely or fall back to legacy geometry.

## Current availability and limitations
- Campaign armory offers named AR/AK presets and per-part selectors for owned generic carbine/rifle classes, gated during active deployment.
- This is **appearance-only for generic owned weapons**. Selecting an AK preset must not imply purchasing an AK serialized weapon, changing caliber or creating magazines. Receiver/variant purchase and magazine ownership require a separate migration.
- Quick Play's dedicated loadout controls do not yet expose family selectors.
- No new sound, damage, capacity or actual ammunition behavior is implied.
- A visual screenshot audit remains necessary before approval.

## Release gates
1. Run npm run check and the focused weapon-family and existing weapon-assembly/geometry tests.
2. Confirm all eleven models have distinct silhouettes, magazine shape, stable hands and nonfloating muzzles.
3. Check four operators and dropped-weapon instantiation on mobile before merging.
4. Do not merge during an ongoing Pages release. Merge at a deliberate checkpoint after build and preview verification.

## Next stages
- W2: visual audit and stronger silhouettes; distinct sights and magazine forms.
- W3: physical weapon-family ownership and ammunition/magazine migration with backward-compatible saves.
- W4: Quick Play selectors, faction-reference weapon assignments and arsenal browsing.
