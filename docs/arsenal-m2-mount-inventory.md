# Arsenal M2.0 — Existing physical mount inventory and geometry contract

**Status:** M2.0 audit and read-only evidence contract, 2026-11-16.  
**Branch:** `feat/arsenal-m2-mount-inventory`  
**Baseline:** M1 PR #1590 (part-owned Picatinny/HK-claw declarations).  
**Authoritative code:** `equipment-weapon-families.ts` + `weapons/geometry/weapon-part-mount-surfaces.ts` + production weapon builders.  
**Audit entrypoint:** `auditWeaponMountInventory(config)` in `weapons/geometry/weapon-mount-inventory.ts`.

## Purpose and boundary

This stage inventories **existing geometry**, not possible historical firearm modifications. It does not add compatible attachments, replace mount surfaces, change saves, mutate the renderer or change gameplay. An M1 declared mount and a physical usable attachment contact are *not* necessarily the same thing.

Coordinates are the weapon's **local art units**, never real manufacturing dimensions. Muzzle direction is **+X**; up is **+Y**; opposing sides are **+Z/-Z**. M1 currently describes `face:'side'` with a single positive Z value: that is **not** a proven left/right selectable pair, nor the exterior rail's contact plane. A contact is not certified just because bounding boxes overlap. Geometry may be decorative or covered, and a future clamp needs actual support, orientation and clearance.

Each audit entry owns the M1 surface unchanged and adds:
- `contact=authored`: a corresponding rail, HK claw bridge or interface is visibly modeled; the *attachment seating and physical clamp* are **not yet validated**.
- `contact=declared-only`: equipment declares an interface but the corresponding support face is not modeled.
- `contact=covered`: support is covered and may not expose the mounting face.
- `contact=unreviewed`: unknown evidence; prevents claiming physical approval.
- `normal`: currently +Y/-Y or unresolved side; no speculative handedness.

These audit annotations are deliberately **not** an alternate eligibility list. M2.1–M2.5 must reconcile the actual part, its declared capabilities, and a single placement/clearance resolver.

## Platform inventory (current authored geometry)

| Platform / part | M1 advertised interface | Visible evidence | M2 follow-on |
| --- | --- | --- | --- |
| AR flat-top `ar-flat` | Top receiver Picatinny / optic | Receiver bar + three coarse instanced teeth; mount span from `-5.3` to `2.3`; support Y `3.01` | M2.1: supported footprint/slot selection, gaps between teeth |
| AR `ar-quad`, `ar-m5-rail`, `ar-risii` | Bottom foregrip, side light | Full rail spines + instanced bottom and ±Z side teeth | M2.1/M2.5: usable subrange, actual side contact plane and +Z/-Z selection |
| AR `ar-compact-rail` | Bottom foregrip, side light | Bottom exposed; **side covers hide rail teeth** | M2.1/M2.5: restrict covered side or author real accessible fitting |
| AR `ar-pri-tube` | **No declared accessory mount** | Decorative upper bridge/teeth exist | Review optic capability by actual bridge/receiver geometry; do not auto-authorize |
| AR A1/A2/retro and plain polymer handguards | No top receiver rail or grip/light interfaces | Carry handle / unrailed furniture | Preserve factory authenticity; no imaginary mount |
| AK `ak-rail-long` | Top optic; bottom foregrip; side light | **Only top rail block is built** at Y `3.12`. No bottom/side support geometry | M2.1/M2.5: reconcile or remove unbuilt declarations before using them |
| Other AK wood/poly/compact fore-ends | None | No accessory rail | Keep unrailed until actual part variant exists |
| AK receiver side | None | No side dovetail or side adapter currently authored | M2.3: receiver-by-receiver evidence, add visual mount + part capability together |
| G3 / HK33 / HK53 / MP5 receivers | HK claw adapter interface | Claw assembly uses four feet and one bridge only when `optic-hk-claw` equipped | M2.1/M2.4: validated clamp/foot support and usable rail spans |
| `optic-hk-claw` | Top Picatinny optic surface | Bridge center X `-1.52`, length `7.75`, top Y `3.15` | Distinct optic clamp and placement footprint |
| MP5 `hk-mp5-trirail` | Bottom foregrip, side light | Broad bottom and ±Z side rail cuboids; lower/side spans from barrel-specific fore-end | M2.1/M2.5: handedness, actual seating, collision clearance |
| MP5SD / MP5K standard furniture | No bottom/side rail | Integral shroud or integral vertical grip | No duplicate suppressor or grip; factory parts stay authoritative |
| FN FAL | None | Classic ventilated furniture, no authored external rail | Preserve current model; no invented mount |
| FN FNC | None | Service furniture, no authored external rail | Preserve current model; no invented mount |
| G36 original | None | Integrated dual optic, carry handle and original fore-end; no modern rail | Keep integral optic; no generic aftermarket mount |

## Known contract gaps identified in M2.0

1. **AK fictitious bottom/side rail**: `FOREND_WITH_TOP` declares foregrip/light mounts, while `ak-silhouettes.ts` only builds the top box. The M1 resolver invents Y/Z positions for those faces. Status: **unbuilt-interface**.
2. **Covered AR side rail**: `ar-compact-rail` advertises light side access, but `ar-silhouettes.ts` invokes `addARRailSegments(...,coverSides:true)` and builds physical side covers. Status: **covered-interface**.
3. **Unhanded sides**: AR and MP5 physical ±Z side faces exist, but M1 exposes one side surface with a single positive Z. Status: **ambiguous-side**; don't infer either user's left/right view.
4. **Legacy light validator bypass**: `familyAccessoryAllowed` gates optic and foregrip by declared mount, but falls through for `light-compact` on most families except original G36. Thus even FAL/FNC/plain AK furniture can accept a light without an authored interface. Status: **unmounted-light-allowed**; M2.5 must handle migration, ownership and UI confirmation before restricting eligibility.
5. **Forward magnified optic**: `ak-rail-long` can still accept `optic-magnified` on the fore-end without eye relief/footprint constraints. Status: **forward-magnified-unchecked**; M2.4 owns correction and save policy.
6. **Optic/rail footprints**: M1 exposes full continuous spans. They are **not** discrete clamp locations. Rendered AR rail teeth have gaps; HK, MP5 and AK designs have different supporting geometry. Do not use continuous bounds as proof that any full optic footprint fits.
7. **AR top bridge mismatch**: rail geometry is visibly built on several AR handguards (including PRI) but only some roles are declared. This inventory intentionally avoids reverse-engineering compatibility from decoration.
8. **Light visual offset**: current compact-light body uses legacy `mountX/Y/Z` and is not seated against the audited side surface for every supported weapon. M2.5 must use a common resolved contact; do not patch the renderer with additional independent family offsets.
9. **Contact/aim distinction**: `resolveWeaponAssembly().sightHeight`, operator poses, weapon contacts and ballistic muzzle coordinates remain authoritative until a separate, explicitly tested migration. A visual support surface is not an aim/shot datum.

## Mandatory M2.1 input contract

A future mount-location resolver must identify:
- **Unique installed owner** (`ownerPartId`, slot, stable surface identifier).
- **Authored capability** (standard and attachment role), plus whether physical support actually exists.
- **Usable spans and footprints** from actual builder landmarks, separate from decorative rail bounds.
- **Face and handedness**: top/bottom/positive-Z/negative-Z explicitly, not one generic side value.
- **Local attachment frame**: surface normal, longitudinal direction, contact plane and orientation without mirrored ambiguity.
- **Blocked/covered regions** (rail covers, receiver intrusions, front sight, hand contact and existing occupants).
- **Dependency** when adapter adds its own mount surface (e.g. HK claw, future AK dovetail adapter).
- **Conservative failure mode** when part geometry or contact evidence is missing.

The resolver must remain deterministic, independent of Three.js scene mutation, computed on configuration changes, and shared by placement validation, Workbench, and production rendering. Never create a rail or grant an accessory solely from a family name, part label or a guessed bounding box.

## Acceptance / evidence

- `tests/arsenal-m2-mount-inventory.test.mjs`: all factory presets; deterministic reports; part ownership; finite geometry; explicit AK/covered AR/ambiguous side/light/eye-relief gaps; HK adapter dependency; FAL/FNC/G36 absence.
- Retain M1 mount tests as the no-change compatibility baseline; the inventory is read-only and **must not** cause changes to the recipe, save, accessory placement, or rendered output.
- This stage does **not** claim art approval, usable rail slots or validated attachment physics. No new geometry budget or production deployment is required until implementation and WebGL review in later batches.

Relevant code: `ar-silhouettes.ts`, `ar-rail-profiles.ts`, `ak-silhouettes.ts`, `hk-rail-accessories.ts`, `hk-mp5-handguard-profiles.ts`, `weapon-part-mount-surfaces.ts`, `equipment-weapon-families.ts`, `equipment-weapon-assemblies.ts`, `breach-weapon-accessories.ts`.
