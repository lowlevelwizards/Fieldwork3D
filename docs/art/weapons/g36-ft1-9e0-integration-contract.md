# FT1.9E0 — Original G36 production-integration preparation

**Status:** Implemented pure art/pose boundary contract. **Not yet a live family, factory preset or Arsenal item; draft PR #1568.**

The FT1.9D1 shape/art phase has two accepted automated proof points: the real G36/M16A2 display ratio is 0.9935 (1.0 authored scale) and all D1 surfaces use a single UV atlas on existing meshes, with side-correct graphics. Human visual approval of the original G36 remains independent.

## Authoritative data

`src/weapons/geometry/g36-family-contract.ts` declares one six-part ID table, unique G36 polymer visual feed, factory dual optics, original muzzle and stock datums, hand/grip/magazine visual contacts, and the measured 1.0 display scalar. The isolated builder imports those same part IDs instead of cloning strings. Test physical mesh intersection of the actual grip, handguard, magazine mouth, stock and muzzle against these future presentation positions.

## E1 live appearance registration (next isolated release stage)

1. Add `WeaponFamily='g36'` and the six factory part IDs to `equipment-weapon-families.ts` as **one** full-size factory preset `g36-service`; do not clone short G36K/C with global scaling.
2. Add one G36 branch to `breach-modular-weapon-geometry.ts` that invokes this same production-intended silhouette (not an independent duplicate). Use the shared cached factory materials and same D1 pixel atlas. Respect bare vs optional muzzle visibility.
3. Map the full-size rifle in `equipment-weapon-assemblies.ts` to the *same E0 contract*: scale, muzzle/stock, grip/support and sight centers. Update `breach-weapon-contact-zones.ts` so hand centers lie outside the correct polymer surface.
4. Add browsable Arsenal G36 platform and genuine factory reference; retain old save IDs. Do not auto-add railed accessories, generic optic or duplicate the built-in dual sight.
5. Explicitly gate incompatible optic mounts, accessory rails and magazine swaps until their physical art exists. Factory historical appearance is *not* an ammunition/gameplay rewrite.
6. Validate one rifle across Arsenal, Operator Studio, on-operator, dropped meshes and replay; right/left support and short-stock poses, reload source, and output geometry/perf parity.
7. Any main integration requires visual sign-off, a green critical suite, successful preceding GitHub Pages deploy and a validated served build stamp. Do not release during parallel queued deployments.

## Deliberate exclusions

No G36K/G36C, alternative optics mount geometry, unvalidated STANAG shared feed, faction assignment, ballistic change, historical issuance claim or full gameplay simulation migration.
