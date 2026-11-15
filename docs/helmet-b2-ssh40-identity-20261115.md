# B2 — Soviet SSh-40 historical silhouette and field identity
Date: 2026-11-15. Status: feature branch, **not approved for production**.

## Design authority / comparisons
- The user's freshly approved M1 R4/R5 on mobile is the **quality and graphic simplification reference**, NOT the shell profile to copy. No M1/ACH/PASGT/DDR/M56 geometry edits.
- Historical visual examples: https://relicsandrifles.com/fieldgear/russia/ssh40.html (front/side/rear/underside of an SSh-40); https://www.ima-usa.com/products/original-wwii-russian-soviet-ssh-40-steel-combat-helmet-with-liner-chinstrap-post-war-repainted (rolled lip, low fasteners and two-piece webbing).
- SSh-40 must read from gameplay zoom as a **deep rounded/bell-like steel pot with a mildly flared continuous lower edge**, not the M1's larger flat shoulder and wide projecting fore/aft brim, a German flared Stahlhelm, or a box with a secondary rim tier.
- Keep Fieldwork's 8 broad planar contour faces, matte paint, strong coherent edges. No dense fiddly hardware, stacked boxes, or photographic roundness.

## Verified code baseline (main fdc0a3f5)
- `src/operator-headwear-silhouettes.ts`: SSh-40 is currently a greedy union of **nine** source cuboids (one dome, four bowl sectors, four 1.48-high edge sectors). It has broad square-sided transitions at crown/bowl/edge.
- Current fit metadata: top Y8.605; front -Z5.53; rear +Z5.53; front hem Y4.05; sides Y3.70; rear Y3.40; outer X±5.40. These are starting fit constraints, not historically sourced measurements.
- `src/operator-wardrobe-head-visuals.ts`: the SSh-40 has a steel shell and material only. **No dedicated SSh-40 retention** or historical liner model is instantiated, unlike M1.
- Current solid colors already curated: `soviet-4bo` and `postwar-green`. Preserve both and the wardrobe save schema.
- Tests `tests/operator-headwear-expansion.test.mjs`, `tests/operator-headwear-materials.test.mjs`, `tests/r5-historical-helmet-d.test.mjs` contain geometric/material-family assumptions. Replace exact cube construction assertions ONLY after new renderer is in place; do not weaken safety or parity checks.

## Implementation sequence — rolling, branch-only
**B2-A0 — audited baseline / captures.** Freeze existing model attributes, bounds, triangle/draw-call budget and public 4-view Studio capture. Compare SSh-40 with M1 and PASGT using same lighting and neutral kit, both mobile close-up and typical gameplay zoom. Save evidence.
**B2-A1 — true SSh-40 shell.** Create a single dedicated faceted, hollow and readable steel surface built once. Broad domed crown merging into long bell wall; gently flared continuous edge with deliberate front/side/rear drop; recessed visible inner surface from underneath. One shell mesh, correctly oriented normals and UV/UV1/color, native material atlas and AO. No extra model fallback. Keep color/material slots and equipment physics unchanged. Fit proxy may remain as coarse metadata **only**, not a second rendered shell.
**B2-A2 — matching attachments.** Align existing head-fit metrics and any integrated dress to actual shell. Preserve room at face and neck. Do not invent an M1-style cover, net, or modern helmet options. Preserve selected/saved colors and appearance identity.
**B2-B — authentic web retention.** Add one restrained two-piece fabric chinstrap with short shell attachment and buckle clear below jaw, using tested PASGT/ACH cheek clearance *only where anatomically relevant*. Historical SSh-40 has low attachment/rivets and a simple cloth strap, not PASGT chin cup or ACH four-point harness. Prebuild both fastened/released geometry if these become visible wardrobe options; keep existing saves and facewear rules safe. Tests must inspect strap triangles/centerline AND actual mobile screenshots, not just centerline values.
**B2-C — visual and performance gate.** Capture front, side, rear, underside/FIT and representative gameplay framing. Check metal underside, brim continuity, neck/face clearance, visual difference from M1/M56, selected color, normals, one-mesh/drawcall and triangle budget, no mobile startup errors. Focused tests + `npm run build`. Hold PR draft until visual acceptance; release only after unrelated production finishes and public Pages build stamp checks.

## Release policy
Commit each completed stage here, not directly to `main`. Critical tests only at rolling stages; group compatible changes into one PR/release checkpoint. Never pile a release over an active Pages deployment. This stage must not reopen approved M1 R4/R5, modern helmets, door AI, FAL, or legacy hidden model variants.
