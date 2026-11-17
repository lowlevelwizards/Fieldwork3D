# Arsenal M2.4 — Optic identity, eye boxes, mounting variants and art

**Status:** authored as stages A–G on the rolling draft `feat/arsenal-m2-mount-inventory`, PR #1597. The feature remains isolated from main/Pages.

## M2.4A — Single optic profile source

`src/weapons/geometry/optic-profiles.ts` owns canonical `OpticProfile` entries for every non-irons legacy selectable optic, factory-integrated G36, and two named 1P78 Kashtan variants.

Each profile defines stable ID, shared optic family, optical/gameplay class, magnification, **specific** mount standard/variant, ring/clamp offsets and span, visual body and eyepiece geometry, eye-box mode/ranges, and preferred positions by platform. `optic-reflex` and `optic-magnified` retain their existing saved IDs and game stat semantics. Named Kashtans are new equipment IDs, not replacements for existing paid items. No arbitrary new gameplay accuracy, recoil, range or zoom effects are applied.

## M2.4B — Exact physical mount variants

- `optic-kashtan-ak` (AK integral-side, 2.8× prism) fits only a physically authored AK left receiver dovetail, *without* a separate Picatinny bridge.
- `optic-kashtan-p` (Picatinny, 2.8× prism) requires physically supported top Picatinny: AR flat-top, a selected HK claw top bridge or a selected AK side-to-top bridge. Plain receiver AK dovetail is not Picatinny.
- The side variant and an installed side-to-Picatinny adapter are mutually exclusive: one physical dovetail cannot be occupied by both.
- `optic-kashtan-ak` and `optic-kashtan-p` have distinct Campaign stock IDs at 285 credits each. Purchase, sale and possession remain the existing inventory ledger's responsibility; selection proposals do not transact.
- A G36 integrated sight remains factory-owned and uneditable as a generic rail optic.
- Receiver-specific AK eligibility continues to be the already authored AK-74M/AK-103/AK-105 mount inventory, never a family-wide assumed dovetail.

## M2.4C — Aimed-eye reference and bounded eye relief

`src/weapons/geometry/weapon-optic-eye-box.ts` derives a stable weapon-local aimed-eye reference from `FAMILY_PARTS[stock].stockX`, plus calibrated family aimed-eye height. It is deliberately a *static pose reference*: it does not query animation state, alter actual shoulder pivots, or update in combat frames. It checks ocular longitudinal gap, optical axis height and lateral offset against optic-specific eye-box allowances. Generic magnified and the Kashtan prism variants have bounded distances. Generic 1× reflex has flexible longitudinal eye placement. Forward AK magnified candidates fail with `forward-eye-relief` while rear bridge candidates remain valid. This is a stylized art-coordinate acceptance model, not an assertion of exact real-world millimeter eye relief.

## M2.4D — Solver and renderer share one physical seat

`physicalAttachmentFootprint` reads optic clamp spacing and body size from the profile instead of maintaining a conflicting optics table. `physicalAttachmentFitOptions` verifies support and eye box for every candidate and returns explicit `mount-conflict`, `eye-alignment`, or `forward-eye-relief` reasons. `opticVisualSeat` chooses the same first valid candidate, including asymmetric direct-side optics and rear bridges. For legacy incompatible saves, a read-only fallback preserves existing rendered equipment; **a failed preview never destroys owned attachments**.

## M2.4E — Two Kashtan silhouettes, one recognizable body

`src/breach-weapon-accessories.ts` builds a shared chunky/faceted optic body, prominent objective and rubber eyecup. The direct-side variant has a substantial lower left clamping bar, a rising offset bracket and a connected upper cradle on the existing receiver dovetail. The P variant uses a short rail clamp touching the selected Picatinny surface. Each variant is a genuinely different mounting geometry without invented screws/rails, loose brackets, unnecessary mark meshes or non-shared materials. Geometry is constructed only when the weapon configuration changes; real-time rigs reuse the existing geometry lifecycle.

## M2.4F — Non-destructive Arsenal proposals

`src/arsenal/compatibility.ts` now requires **physical fit** for new optic proposals, not just legacy M1 `weaponAttachmentAllowed` flags. If the proposed optic requires an AK bridge, it appears as a dependent multi-part proposal with confirmation. Swapping to a direct-fit side Kashtan proposes removing an existing side bridge (and reports that change) instead of doubling the receiver mount. No proposal silently charges credits or changes source recipe objects. Existing `WeaponConfiguration.version=1` and `ArsenalRecipeV2.version=2` are unchanged, as is the Campaign inventory/return mechanism.

Newly requested magnified optics on AK forward-only rails require a valid rear adapter; old saves carrying a generic magnified optic on a forward rail remain readable and flagged as unresolved without stripping the optic.

## M2.4G — Test/release gate

`tests/arsenal-m2-optic-identities-eye-box.test.mjs` covers profile catalog completeness, mount standard and dovetail exclusivity, optic clamp/eye-box contacts, forward-vs-rear AK, actual optic and bracket mesh bounds, atomic adapter exchange, V1/V2 saved IDs and stock returns, no mutation and existing AR/HK/G36 behavior. Keep all M2.0–M2.3 tests. Typecheck and production build are mandatory CI checks on the feature branch.

## Deliberately deferred, unchanged

- M2.5: fitted lights/foregrips/support hand and full cross-face 3D collision checks; broader real-browser visual/performance inspection.
- M2.6: persistence of explicit rail location/left/right choice and complete Campaign purchase-exchange transactions.
- M2.7: touch-friendly Workbench position selection.
- M2.8: final screenshot/art/performance audit, branch integration and safe release checkpoint.
- Later optics content: Kobra, PK-A, PSO-pattern scopes, Western models and period-specific catalog expansion.
- Live ballistic/muzzle, shooting skill, magnification viewport, field-of-view, ADS penalties, recoil, operator eye-pose dynamics and weapon handling are not affected.

**Release protocol:** stage commits on the branch, run focused tests, batch compatible stages; do not merge during another production deploy or until the previous Pages build is verified. Main has independently advanced, so reconcile at the release checkpoint rather than overwriting its changes.
