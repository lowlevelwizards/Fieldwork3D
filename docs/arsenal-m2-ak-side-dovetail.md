# Arsenal M2.3 — AK receiver side dovetail and optional Picatinny bridge

**Scope:** build-time art, receiver-owned mount interfaces, optional adapter inventory ID, legacy-compatible optic placement, read-only footprint solver, focused tests.  
**Branch:** `feat/arsenal-m2-mount-inventory` (rolling M2.0–M2.3 PR #1597).  
**Art contract:** `src/weapons/geometry/ak-side-mount-geometry.ts` owns *all* local coordinate landmarks and both geometry builders.

## Locked behavior

1. **Only `ak74m`, `ak103`, and `ak105` receiver identities** expose the first authored side dovetail. These AK-100/74M-era models gain one visible left-side receiver rail in their production silhouettes. Classic AKM/AK-74, RPK-74, AKS-74U, FAL, FNC and G36 are not inferred to support it.
2. **No universal AK optic mount.** The dovetail is receiver-owned, `standard:'ak-side-dovetail'`, `face:'side'` (physical side **left**, local negative Z). It exposes both `opticMount` for a bridge and an `optic` interface reserved for future specifically authored *direct-fit* optic variants.
3. **A bridge is an actual equipable part:** `optic-ak-side-picatinny` in `opticMount`, priced at 125 existing Campaign credits; no auto-purchase. The existing Arsenal atomic proposal mechanism can offer it as a dependent change when the selected receiver has a rail and a generic Picatinny sight needs one. Confirmation remains required for multi-part changes.
4. **No handguard replacement:** installing the adapter doesn't alter the wood/poly/forward-railed handguard. It also doesn't remove or upgrade other receiver/furniture.
5. **The bridge is rendered only when equipped.** A big asymmetric left-side clamp, rise, offset elbow and long rear top rail are merged into one shared-material mesh/draw call, modeled for silhouette rather than microscopic manufacturing detail. The installed receiver dovetail itself is another one-mesh object. No per-frame allocations.
6. **The adapter owns the new top optic surface**, at Y `3.36` and X `-5.72 .. +1.68`; the forward AK rail remains a separate source. When a bridge is installed, `preferredOpticMountSurface` chooses the bridge before the forward rail. Visual optic seating is rearward and physically touches the bridge, not the dust cover. Old `WeaponConfiguration.version=1` and `ArsenalRecipeV2.version=2` shapes are unchanged.
7. **M2.2 fit chooses the rear mounting path.** The bridge requires the left receiver's actual dovetail bar. A generic magnified optic remains disallowed *on the forward fore-end*, but is allowed on a separately installed rear bridge; invalid forward magnified candidate locations are omitted. No legacy save gets silently repaired by a read-only preview.
8. **No catalog of fictional direct-fit sights.** Later named Kobra, PK-A, Kashtan and PSO variants must declare precisely their own mount variant and artwork before the direct-dovetail role becomes equipable. A Picatinny generic reflex or scope is **not** automatically a side-dovetail optic.

## Geometry contract (stylized model units)

- Receiver contact: lateral **left** at Z `-2.55`, X `-4.65 .. +1.05`. The dovetail is physically outside the receiver's left side and is visible as a prominent low bar with upper/lower lips.
- Adapter: an engaged left bracket rises behind the receiver into an offset rear bridge. Top bar center X `-2.02`, Y `3.12`, top contact Y `3.36`, length `7.4`, width `2.42`. This leaves the AK dust-cover silhouette distinct.
- The source M1 `WeaponMountSurface` and M2.1 `PhysicalMountSlot` expose these surfaces, face normal (Z=-1 for the receiver dovetail), stable IDs and the adapter's own top support span. The bridge never appears solely because the user chose a sight.
- These are **Fieldwork visual coordinates**, not instructions for mounting actual firearms.

## Known limitations / later stages

- **M2.4:** optic-specific mount variants and actual eye-relief / sight selection, including a truly direct-fit named AK optic, rather than generic sight = any Picatinny clamp.
- **M2.5:** physical renderer placement for every attachment including side-rail lights/foregrips, handle clearance, cross-face collisions and final close/quarter-view art review; keep the adapter at one readable merged silhouette.
- **M2.6:** optional persisted rail slot/face selection and explicit adapter/handguard purchase and conflict-aware transactions. Existing M1 recipe and stock behavior continues for currently authored opticMount slot.
- **M2.7:** user-facing rail/adapter choices and iOS-friendly selection UI; never replace furniture or buy parts silently.
- **M2.8:** full real WebGL screenshot pass, material/triangle/draw-call audit and release validation.

## Acceptance

`tests/arsenal-m2-ak-side-dovetail.test.mjs` covers exact receiver scope, absence on classic AKs, actual mesh contact bounds, adapter omission when unequipped, mesh top contact with sight supports, two valid rear optic types, classic forward magnified block, one-sided fit, price/ownership registration, proposed dependent adapter change, and V1/V2 save/replay-facing identity preservation.

Keep M1–M2.2 focused tests, typecheck and production build green on the feature branch; merge only at the designated batch checkpoint after the previous GitHub Pages deployment is verified.
