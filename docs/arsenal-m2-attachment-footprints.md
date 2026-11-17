# Arsenal M2.2 — Physical attachment footprints and clearance (preview only)

**Status:** implemented on `feat/arsenal-m2-mount-inventory`; not a live equipment gate, save migration or art change.  
**Code:** `src/weapons/geometry/weapon-physical-mount-fit.ts` and structural spans in `weapon-physical-mount-slots.ts`.  
**Tests:** `tests/arsenal-m2-attachment-footprints.test.mjs` plus M1 and M2.0–M2.1 tests.

## Intent

A M2.1 contact alone does **not** prove an accessory fits. M2.2 resolves real installed part surfaces, verifies all required foot contacts, checks visual clamp/base clearance against modeled structural support, reports overlaps, and computes a deterministic list of candidate placements. No part, attachment, optic, recipe or Campaign stock is changed during a query.

**Critical art distinction:** AR's tooth mesh is an instanced, deliberately oversized stylized representation. Its individual decorative tooth span is not the structural rail's full span. Each physical contact now carries both `contactStartX/contactEndX` (the tooth) and `railStartX/railEndX` (modeled supporting spine/bridge). Clamps can sit across the structural body without requiring implausibly contiguous decorative teeth.

## Attachment footprints (local art units)

| Attachment | Support requirement | Occupied X half-width | Special rule |
| --- | --- | --- | --- |
| Reflex | Two distinct AR teeth at relative -1.5/+1.5, or one modeled continuous rail zone supporting both contacts | 2.0 | Top face only |
| Magnified | Two distinct rings at -1.65/+1.45, or one continuous span supporting both rings | 3.75 | Do not allow generic long-eye-relief optic on AK forward fore-end |
| Vertical foregrip | One bottom-rail tooth / continuous zone supporting a 3.35-wide base | 1.675 | Full base must remain within structural fore-end rail |
| Handstop | One bottom-rail contact, short 2.36-wide visual base | 1.18 | Full base must remain within structural fore-end rail |
| Compact light | One exposed side-rail tooth or continuous zone; its mounting bracket is offset 1.40 behind the body center | 2.68 | Side must be explicitly weapon-left or weapon-right |
| HK claw bridge | All four receiver claw-foot contacts as a single group | Adapter dependency only | Adapter's own top rail appears only when installed |

These dimensions follow the **existing** procedural accessory render geometry. They are not measurements of commercial Picatinny/AK clamps and should not be presented as such. Named, mount-specific optics (e.g. integrated Russian side sights) are deferred until that equipment exists in the actual catalog.

## Pure public API

- `physicalAttachmentFootprint(id)`: read-only current accessory footprint.
- `physicalAttachmentFitOptions(config,id,occupied?)`: `{feasible, options, reasons}`, never commits equipment.
- `previewPhysicalMountBuild(config)`: predicts current mounted accessories in the fixed opticMount → optic → foregrip → light order. Any unmountable historic attachment appears in `unresolved`; it is **not** removed from the saved configuration or Campaign stock.

A placement contains the stable mounted part, declared source surface, side, physical foot IDs, support standard, spatial center and an occupied longitudinal envelope. A same-face, same-height-and-depth X overlap prevents two bodies from occupying the same rail section; an opposite-side mounted light is allowed. This is a **first-pass rail-level occupancy policy**, not a full voxel or swept-volume check of every stylized 3D accessory. Actual accessory mesh parity and cross-face clearances will be reconciled in M2.5.

Failure reasons include:
- `unknown-attachment` — not an approved current externally mountable item;
- `no-physical-interface` — current installed parts expose no authored support;
- `missing-adapter` — a supported HK receiver needs its claw top-rail adapter before a Picatinny optic;
- `missing-four-claw-contact` — incomplete proprietary bridge interface;
- `insufficient-support` — missing two-ring points or insufficient structural clamp span;
- `insufficient-clearance` — grip base extends outside its modeled rail;
- `forward-eye-relief` — current generic magnified optic on an AK forward handguard;
- `occupied` — all remaining candidate locations would collide with an already reserved same-face part.

## Preserve the non-destructive Arsenal contract

- **Do not** install a rail, change handguard, buy an adapter, remove a light or migrate a saved magnified optic merely because it fails this preview.
- A classic AK with wooden furniture still has **zero** physical foregrip/optic/light rail positions.
- The AK railed handguard still has **only** its physically modeled upper rail, notwithstanding the old permissive bottom/side declarations.
- Covered AR compact side rails give **zero** light candidates.
- The G36 original remains factory-integrated, with no aftermarket universal optic interface.
- The existing M1 `weaponAttachmentAllowed` and V1/V2 save roundtrip remain in place until an explicitly reviewed transition. M2.2 reports incompatible historical configurations for a migration proposal at M2.6; never drops owned equipment silently.

## Follow-on stages

**M2.3** AK side-dovetail variants and visible adapter/direct-fit hardware (only on receivers that can physically support them). **M2.4** optic-specific eye-relief, footprint and sight types. **M2.5** actual fitted side/light/grip mesh placement with cross-face clearance and support-hand parity. **M2.6** optional persisted positions and Campaign-aware atomic accessory/part proposals. **M2.7** mobile-first slot/face selection UI. Later dedicated optic-content milestone introduces Kobra, PK-A, Kashtan, PSO etc. as named 3D assets.

No render-loop allocations, no WebGL scene query and no new meshes are introduced by the M2.2 solver.
