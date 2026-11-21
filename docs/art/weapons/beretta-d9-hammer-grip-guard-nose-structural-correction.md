# Beretta D9 — structural miniature correction from production iPhone review

**2026-11-20 · Fieldwork Breach / M9–92FS and M9A3 · art-only secondary previews**

Evidence: six live user-supplied D8 iPhone captures (side, oblique, top, muzzle, reverse) and the canonical [Universal Weapon Art & Production Standard](weapon-production-standard.md). The source review identified an unrooted hammer, wrong grip/panel rake, visually fractured front trigger guard, busy and over-articulated nose, and triangles spent on invisible details.

## Intent and scope
Authentic identity through a **toy-like, chunky, short, strong silhouette**, not mechanical realism. The M9 and M9A3 must remain distinguishable through their different backstraps, exposed six-facet barrels and A3-only integral accessory rail. This is appearance **only**; neither model is issued or shootable. Never add a trigger, gun behavior, materials, a renderer, movable parts or a save migration. Leave Glock builders, all equipment, sockets, magazine/replay data and default camera controls untouched.

## Source-anchored D9 surgical edits
- **D9 A / hammer** — `hammer:Outline`: put both base points **inside** the slanted rear slide shell (at X−8.18 and −8.47, Y2.16) instead of dangling aft of it. One nine-point thick, short, horizontal-hook profile; visually evaluate true overlap in side and rear quarter, not bounding-box contact alone.
- **D9 B / grip and rear** — `outer:Outline`: shift the A3 backstrap shoulder at Y−5.18 rearward, and pull the front grip/heel into a more intentional lean. Shorten the rear frame beavertail from X−10.65 to −10.23, strengthen its return into the frame. `gripPanel:Outline`: six broad planar points on each face, with different classic/A3 rake, fully inset along **all edges** (not just vertices); no extra bevel meshes.
- **D9 C / guard** — `outer:Outline` and `opening:Outline`: thicken forward and top web at its real through-Z negative space, preserving a roomy open trigger guard. Test material at the front pillar and above opening and absence of material in the aperture. Do not hide the gap with a surface-only patch.
- **D9 D / muzzle** — `m9UnifiedFrontShell`: simplify 12-to-10 deliberately large contour stations, one lower undercut and two large cheeks; shorten roof, integrate blunt front sight; leave a real upper opening and conspicuous projecting six-sided barrel. No multiple tubes, trim rings, extra posts or duplicated details.
- **D9 E / triangle and rendering review** — same 14 M9 and 15 M9A3 meshes; budget **≤370 actual emitted M9 / ≤394 A3 triangles** (both under D8 caps of 376/400). Preserve pooled palette and `clearM9Appearance` disposal. Run focused art tests plus build, independent WebGL phone (390px) and desktop captures at side, other side, rear/front quarter, top, and critical secondary/Arsenal checks.

## Visual rejection criteria
Any floating hammer root, polyline/panel escape outside the frame, guard-front discontinuity, toy muzzle resembling stacked rings/boxes, closed barrel channel, disappearing front sight, newly stretched upper/magazine, accidental extra mesh/material, or side/three-quarter cropping means **do not merge**. Geometry tests prove technical shape constraints but do not substitute for reviewing actual renders.

## Release
Commit on feature branch, run only critical validation, reconcile against current `main`; merge **once** when exact-head checks and visual review are green and the previous Pages production run succeeded. Confirm the new production Pages job and its public expected-build check before reporting release.
