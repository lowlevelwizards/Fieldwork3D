# S1-A1 — East German M56 coherence prototype

## Design and source authority
The actual eleven-way Fieldwork Studio capture (S1 PR #1480) shows the East German M56 as the highest-priority outlier. Its *original* visible mesh was the greedy union of thirteen crown, upper, middle and lower-flare cuboids, making three horizontal terraces. User-approved Fieldwork direction: **bold, boxy and abstract; chunky major forms, minimal geometric detail, not artificially smooth**. Protect the approved M1 and SSh-40.

Historical comparisons: Imperial War Museums' M56/76, period military reference photographs of DDR M56 shell (distinctive continuously tapered sides, projecting swept rear and slightly higher front edge). Do not imitate the M1's rolled bowl or the SSh-40's symmetric flare. The early M56 had three visible liner rivets; later variants can be smooth.

## Single-shell implementation
- New `operator-m56-unified-shell.ts`: **one indexed 8-facet stamped surface** with roof, broad shoulder, *one continuous wall*, integral flared skirt, thin lower steel termination, inward return, recessed interior wall/roof. There are no independent middle/brow/lower-shell cuboids rendered.
- Canonical +Y up, -Z front; full historical fit extents preserved: Y top 8.775, X ±6.87, front Z -6.80, rear +8.10, hem front Y4.65, side Y4.43, rear Y4.225. Skin clearance checked on real triangles, not just fit boxes.
- Source 13 cuboids remain **only as non-rendered fit metadata** so no outfit/physics/compatibility API break. Existing material atlas uses UV+UV1, painted steel surface, vertex color tones, user-provided solid colors; no new wardrobe options or hidden legacy renderer.
- Existing selectable early rivets replaced with two side and one rear fastener; late smooth remains intact. Sparse net adjusted to the actual single shell instead of three floating bands. Defaults and saved states unchanged.

## Comparison / QA gates
- Focused tests: one shell, eight angular perimeter segments, deliberate large primary planes, long sweeping rear flare, roof/underside normals, no bottom closure, exact fit invariants, raycast clearance on all four square-skull corners, cached optional details and existing wardrobe colors.
- M1, SSh, PASGT, ACH/MICH visual behavior unchanged by source edits; regressions of headwear/materials + production typecheck/build.
- Actual 44-view matched Studio captures via `scripts/helmet-b0-m1-capture.mjs`: front/side/rear/FIT for M56 vs M1/SSh/PASGT/ACH and M1 strap states. Compare both normal Studio and gameplay zoom before merging.
- Release only after GitHub checks pass and previous production deployment verified; when deployment triggered, confirm GitHub Pages serves exact merged SHA.
