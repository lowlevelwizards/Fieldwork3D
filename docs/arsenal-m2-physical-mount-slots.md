# Arsenal M2.1 — Physical mount positions and handed rails

**Status:** authored geometry contact positions, pending M2.2 footprint enforcement.  
**Branch:** `feat/arsenal-m2-mount-inventory`; follows the M2.0 [inventory](arsenal-m2-mount-inventory.md).  
**Single source for new placement work:** `physicalWeaponMountSlots(build, opticMount)` in `src/weapons/geometry/weapon-physical-mount-slots.ts`.  
**Tests:** `tests/arsenal-m2-physical-mount-slots.test.mjs`.

## Design decisions locked for M2

1. **Installed part owns compatibility**. No phantom family-wide Picatinny, dovetail or proprietary rails.
2. **Explicit reversible change proposals**, not silent swaps: later Arsenal can offer a compatible handguard, adapter or *authored* optional rail section. Campaign shows price, ownership and displaced parts before confirmation.
3. **No rail magically appears on plain AK furniture**. A wooden or polymer handguard stays unrailed until the user selects a supported replacement or an explicitly modeled rail-section part with a real attachment interface.
4. **Adapters have visible shape and mount dependencies**. Direct-fit side/dovetail optic variants do not require a duplicate generic adapter.
5. **Named optic items with reusable behavior classes** in a later content milestone. E.g. a specific 1x reflex with an integrated side mount is distinct from a Picatinny-mounted 1x reflex, but both share a functional sight class. M2 builds the mount semantics without adding a large optic catalog.
6. **M2.1 is read-only**. No save, inventory, ballistic sight, rendering, class attachment or eligibility change. Unsupported old builds are not auto-deleted.

## Art-axis contract and available positions

+X = toward muzzle; +Y = up; **+Z = weapon right**; **-Z = weapon left**. `face:'left'|'right'` is intrinsic to the weapon, not camera orientation. Face normals are outward, never confused with operator pose vectors.

**AR receiver:** three mount centers at X `-4.5,-1.5,1.5`, tooth width `.66` and top support Y `3.01`. Actual builder: `addARRailSegments`, with a top Y `2.84` and tooth height `.34`.

**AR railed fore-ends:** use the exact tooth placement formula `start+.8+i*(span-1.6)/(count-1)`; count **5** for `ar-m5-rail`, otherwise **4** for `ar-quad`, `ar-risii` and `ar-compact-rail`. Bottom Y: `-1.82` (regular) or `-1.64` (RIS II). Uncovered sides are at Y `.59`, and their **outer** Z contact faces `-2.57,+2.57` (teeth center +/-2.39 plus depth .36/2). The existing M1 `weaponPartMountSurfaces` side/bottom Y includes a misplaced `AR_VISUAL_AXIS_Y` shift relative to the instanced teeth; the new physical query uses the *builder's actual Y*, and M2.5 will route accessory rendering through it. Compact covered sides yield **zero** exposed light positions.

**AK rail handguard:** three candidate centers at 25%, 50%, 75% of the actual continuous top block, at Y `3.12`. No bottom or side positions exist because the builder does not author those rails, notwithstanding the M1 legacy declarations. Standard wood and polymer fore-ends return no slots.

**HK claw receiver:** one four-foot adapter requirement from rear/front X `-4.60,+1.25`, at Z `-1.13,+1.13`. Each foot is a contact point; the four aren't interchangeable single mounts. A fitted HK claw adapter independently exposes its own continuous top bridge, Y `3.15`, with three coarse candidate centers over the authored bridge length.

**MP5 tri-rail:** three coarse candidate centers over each of the modeled continuous bottom, left and right cuboids. Bottom support Y `-1.775`; left/right exterior Z `-1.755,+1.755`, side center Y `-.29`. The MP5SD shroud and integral MP5K foregrip do not auto-generate aftermarket rails.

**FAL, FNC, G36 original and plain classic furniture:** no new mount locations. G36 factory dual sight remains integrated.

## Contact model

Each `PhysicalMountSlot` has a stable ID, M1 source surface ID, owner ID/slot, standard and role, explicit face, local position, outward normal, exact support X span, support kind (`rail-tooth`, `continuous-rail` or `claw-foot`), support group ID, and (when necessary) a four-foot claw dependency.

A `rail-tooth` contact is an actual tooth, not necessarily a whole optic position. A `continuous-rail` contact is a deterministic coarse **candidate center**, not proof of any standardized discrete rail pitch or mountable footprint. **No candidates themselves reserve space**: footprint length, support pairing, eye relief, cover obstructions, grip/laser/light clashes and mount clearance are explicit M2.2+ work. The clamp/attachment must pass those checks *before* a candidate becomes a valid choice.

**Production rule:** new selection UI and the footprint solver use physical candidates, never the M1 declared span or an independent renderer offset. The installed part must expose a matching interface and visible support. M1's source behavior remains unchanged for saves until validated migration with explicit user-facing choices.

## M2.1 acceptance checks

- Factory preset coverage, deterministic output, unique stable IDs, owner-interface correspondence, valid geometry and no config mutation.
- Direct mesh evidence from rendered AR instanced teeth, AK top block and MP5 tri-rail cuboids; actual Y/Z side contact and tooth X widths checked.
- AK fictitious side/bottom slots absent despite legacy declarations; AR covered sides unavailable.
- HK four-foot paired dependency, with adapter top rail only when equipped.
- Two genuine side faces and opposite contact normals for AR/MP5.
- FAL/FNC/G36 and unrailed furniture remain empty.
- M2.0 and M1 tests, TS typecheck and build remain green.
- No geometry mesh or texture allocation occurs within the placement query.

## Next: M2.2

Define optic, foregrip, light and later laser footprints against these positions. Compute occupancy, continuous support/required clamps, front sight/receiver and support-hand clearance, eye-relief constraints as appropriate. The solver must report **why a slot is blocked** and which explicitly modeled handguard/adapter alternatives could resolve it. Keep automatic modifications as **proposals** until confirmed, with actual Campaign ownership/price validation added to M2.6.
