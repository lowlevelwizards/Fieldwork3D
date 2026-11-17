# G36 P5 — production master reconstruction, baseline and reference lock

Status: **implementation branch / awaiting mobile art approval**. This is a **single original full-size Bundeswehr G36 dual-optic service master**, not the G36C/K, later G36A2 rail sight, or modernized stock. No new ammo, faction presets, mechanics, magazine feed, or saved body IDs.

## Reference lock and claims
1. [Heckler & Koch official G36](https://www.heckler-und-koch.com/en/Products/Military%20and%20Law%20Enforcement/Assault%20rifles/G36) — maker/family, molded polymer and folding stock. Current product images might show modern features; they are not automatically historical originals.
2. [Bundeswehr G36, published 2019-09-09](https://www.bundeswehr.de/de/ausruestung-technik-bundeswehr/ausruestung-bewaffnung/gewehr-g36) — original 480-mm full-length category, polymer body/stock, 3x telescopic optic plus reflex sight, folding stock.
3. [HK G36 armorer's manual, component figure](https://s3.amazonaws.com/hk-manuals/files/Armorer/G36/HK_G36-SL8_Family_Armorers_Manual.pdf) — side and opposite views, stock/hinge/optic/handguard/receiver relations.
4. [HK 2004 Military & Law Enforcement catalog, G36 optic identification](https://s3.amazonaws.com/hk-manuals/files/Catalogs/Military/2004_HK_Military_and_LE_Catalog.pdf) — original integrated dual optical system, distinguish from later rail configuration.

**Representation level:** recognizable stylized original G36 service appearance, *not* measured engineering-perfect or dated-unit issuance. Reference-derived major proportions are interpreted as **local game-art visual units**, not weapon-making dimensions.

## Seven identity landmarks
- Long hollow handle whose roof links a chunky rear two-optic stack and a characteristic slanted front leg.
- Distinct lower horizontal magnified optic and upper shorter reflex, with bold front lenses.
- Two genuine openings in the thin but sturdy folding polymer stock; rear lower line drops toward pad.
- Broad crown/shoulder of glass-fiber/polymer receiver, less deep than handguard.
- Long blunt polymer guard with four substantial side ventilation marks, distinct from HK33 metal fore-end.
- Translucent-looking gently swept polymer magazine, not the stamped STANAG metal magazine.
- Stout exposed full-length barrel with a visually quiet terminal muzzle.

## Prohibited confusions
Not M16A2 short carry handle; not G3/HK33 diopter/metal cylinder; not AK stamped sheet metal or high-sweep magazine; not FNC long stamped upper / fold stock; not railed G36C/K or export single optic.

## Peer and scale gates
Use the **actual** production Arsenal M16A2, AKM, G3A3, FAL 50.00, FNC factory builders in `scripts/audit-arsenal-a4.mjs` and `g36-ft19b-lab.html`; do not fabricate imitation peers. P4 baseline = commit 98000459, refactory build g36-service. P5 metrics must be freshly measured; historical peer records are not asserted to equal the current branch.
Capture all models side, 3/4, opposite, front, top, lit-clay and flat silhouette, 64 and 128px. This is a **visual review requirement**, not an automated art-signoff.

## Rolling implementation checkpoints
- **P5.0:** this reference/baseline record, existing real-builder census and capture harness.
- **P5.1:** stock and integrated sight/handle major silhouette using the same factory builder; preserve stock rear X -15.05, muzzle X 19.50, two and one real openings.
- **P5.2:** receiver, grip, handguard station shapes and plain barrel; align animation, mag-mouth, hand/muzzle contacts. No dummy connector meshes.
- **P5.3:** G36-specific magazine contour still based on shared curve mathematics, finish/value and large vents; avoid extra per-detail meshes.
- **P5.4:** update shape tests to durable relational invariants; catalog-wide measured census, browser peer comparisons, TS/build and carried/held/reload presentation.
- **P5.5:** merge the compatible branch batch at a quiet Pages release checkpoint; verify previous exact served build before merge and new Pages stamp after. User iOS screenshot review remains pending unless explicitly approved.

Budget guidance from universal standard: roughly 400–550 triangles / 20–28 meshes is typical, but **do not suppress defining openings just to hit a number**. Avoid per-frame material/atlas geometry allocations. Keep six stable body part IDs, magazine feed identity, save compatibility, weapon presentation datums, original-integrated optic accessory gating. Changes to contacts require synchronized tests. Current P2/P4 numeric assertions must not silently prevent approved new geometry.
