# FNC P18 — silhouette-first release gate

## Why P17 was rejected artistically
The actual P17 five-rifle WebGL capture from the previous release (run 43778254938) looked virtually the same as P16 at Workbench scale. Tiny 5–14% tweaks and a numerically distinct but similarly shaped receiver did not achieve the requested Fieldwork caricature. P18 must therefore be evaluated against that P17 capture at identical view, canvas size and framing, *before* merging.

## P18 design
- Square, heavy receiver crown: visual roof Y1.60→1.93, a broader top shoulder (roof Z half-width .67→.88) but side wall remains slimmer than lower Z1.39 vs1.71. Lower receiver body deepens; a single square magazine seat reaches Y−3.62 (was −3.34), around the unchanged curved STANAG neck. Preserve distinct side-specific charging control.
- Monumental polymer: full six-face body grows mostly downward and outward; lower-only flare .10→.83, full section width grows approximately 22%, front moves from X10.70 to11.68, rear stays concealed at X1.95. No new connector boxes. Strong six-face tapered endstop extends forward, length .70→.88.
- Upper gas spine/receiver roof relationship preserved: Y1.52→1.85, receiver Y1.93. Upper vents four separated broad groups per row instead of five fine groups, length 1.06→1.57, height .205→.31, with long lower polymer grooves expanded to .38 height; same batched geometry and no extra draws.
- Stock: upper beam .84→1.12 thickness, buttpad height 4.12→5.19. Do not fill the negative space, change the stock rear X−14.85, or disrupt the folding hinge.
- Rear aperture outer guard enlarged in both X and Y to remain prominent. Front twin sight ears rise with upper spine to Y2.77, stay a two-ear open shape.
- Exposed barrel thickness1.14→1.34 around unchanged boreY0. Stubby factory muzzle radius .80→1.03 and length1.54→1.30, tip X19.50. Existing four batched dark ports reproject to updated hex facets; nonfactory/suppressed does not render factory body/ports.

## Protected constraints and risk audit
Bore Y0, tipX19.50, stock rearX−14.85, magazine X1.54 topY−2.81, primary hand/grip position, factory part IDs and FAL/HK/AR/AK geometry untouched. New geometry is still six-sided, no high-poly bevels, screws, extraneous panels, new animation states or render-loop allocations.

The enlarged receiver must retain lower proud-side stamping, unobstructed charging handle and FNC profile. Handguard must not swallow gas vent row. Bulky stock pad must not fill triangular negative space. Stronger front sight must not become a third-post tower. Large muzzle must remain shorter than a suppressor. Any new gap/overlap or illegible small-scale form requires revision, not another unverified production deployment.

## P18 release rules
1. Run focused FNC/FAL geometry, factory/suppressed and modular catalog checks; build and browser.
2. Download FNC P17 reference side and three-quarter captures from successful run 43778254938.
3. Download P18 WebGL artifact from the PR branch run, compare the exact same view and scale. Inspect both small-scale and enlarged crops. The actual rendered side silhouette must be visibly distinct and more iconic, not merely a larger numeric AABB.
4. Before production merge, verify no pending Pages deployment, previous public Pages build stamp correct and PR clean/CI green.
5. Merge only after **visual** pass, then verify the public live Pages stamp against the merge SHA.
