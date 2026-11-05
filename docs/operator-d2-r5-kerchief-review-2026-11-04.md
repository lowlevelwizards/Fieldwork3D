# D2 R5 — oversized facewear repair, Nov 4 2026

## Screenshots reviewed
User mobile Studio build `203bcd8`:
- Gaiter mouth and nose+mouth are continuous and working. **Do not rebuild** this family.
- Shemagh head-wrap has an upper rear slit and looks too finely segmented beside the cube head.
- Bandana knot is good, but its face sheet ends essentially at the chin and acts like a belt, not a hanging tied kerchief.

## R5A — bandana
Preserve the existing `bandana` wardrobe ID and `raised`/`lowered` modes.
Build a distinct band and a projected, long hanging **triangular** front from connected bold tiers.
Keep the upper cheek-to-rear band and existing knot/tails. Stop cheek panels around the lower face,
allowing the triangle to hang freely several model units below Y=-.65 chin.
Do not replace the triangle with a chunky tube or shorten it to follow the square jaw.
Lowered wearing mode remains visibly below the mouth and shorter than the shemagh.

## R5B — shemagh
Four large chest tiers and three broad diagonal face folds; less millimeter-scale layering.
The wrapped crown rear bands overlap the top cap in Y, rather than leaving a thin exposed skin slit.
The rear closure joins face-wrap and crown, preserving the open eye slot and the long asymmetric tail.
Use a few strong masses and don't add decorative floating strips.

## R5C — gaiter compatibility / QA
Leave the approved gaiter mesh unchanged. Focus tests on continuity below jaw, correct mouth/nose heights,
independent facewear color, original balaclava topology, and stable saved modes.
Keep canonical -Z forward / +X right / +Y up, 8×8×8 head, cosmetic-only equipment boundaries.
No animation-time geometry construction or extra render pass.

## Release checkpoint
Only the focused R5 test list and production build/typecheck gate per PR, plus mobile Studio smoke.
Keep R5A/B/C commits on feature branch until the same batch is mergeable and green.
Check Pages workflow idle and the public `fieldwork-build.json` matches current main via the existing CI
check before merging. Do not stack a production release over a running/failed previous deploy.
The integrated build requires manual front/side/back/3/4 inspection on mobile after release.
