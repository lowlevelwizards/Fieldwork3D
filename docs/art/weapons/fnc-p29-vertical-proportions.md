# FNC P29 — slim receiver and compressed fore-end

## Why
The approved P28 factory FNC has a recognizable low-poly form, but the upper receiver, handguard, gas box, stock rods, and buttpad are vertically too heavy compared with the supplied FNC reference photos and the existing FAL/G3/AR Arsenal family. This is a proportion correction only: **no new art assets or mechanical changes**.

## A — Upper receiver and STANAG housing
- Crown roof **Y1.93 → 1.50**, rear roof Y1.77→1.39. Straight wall is 1.10 rather than ~1.83: crown shoulder Y0, bottom Y−1.10. Keep four longitudinal six-sided stations, Z width, and square nose X2.75.
- Reseat solid rear sight and operating handle **Y−0.43** so they intersect and read properly; slot texture shifts down with the face (without geometry).
- One-piece lower receiver/mag housing remains eight corners; leave the nose X2.75, set well front **X2.45** (behind nose), rear **X−1.58**. Mag/steel ribs/polymer toe all use shared AR insertion center **X0.45** from X1.05, preserving 3.38-unit magazine mouth width and >.30 clearance each side.
- Well lip rises slightly toward the muzzle: Y−3.46 at rear and Y−3.32 at front. No flare/funnel, no independent magwell mesh, magazine bottom still at its original Y.

## B — Fore-end and sights
- Polymer six-face transform: `heightScale` **1.30→1.20**, `lowerFlare` **.43→.23**, unchanged X and Z; resulting main body height ~3.01→2.59. Handstop inherits same transform and stays molded onto the polymer.
- One continuous gas envelope roof **Y1.85→1.50**, forward belly **Y−1.57→−1.10**; rear gas bottom Y−.60, shoulder and lowerStartX X10.85 / lowerFullX X11.80 unchanged. Do not add separate objects or split gas body.
- Front sight base top Y1.73→1.38 and ears down .35 to Y1.33–2.42, preserving twin-ear gap. Barrel remains at axis Y0; it visually exits the lower part of the shorter forward gas block.
- Existing **4+4+4 vent markings**, P28 stacked front marks, and two polymer grooves retain their X/UV placement and visible sizes. Receiver slot shifts with new shell and atlas vertical bounds.

## C — Folding stock
- Upper rail thickness **1.12→.98** and Z depth 1.04→.96. Lower kinked rail profile edges move inward ~.08 and Z depth 1.12→.98, keeping the same X endpoints.
- Dark buttpad front edge moves rearward for front-to-back thickness **.83→.67** while preserving rearmost X−14.85 and previous pad height. Do not change hinge, web, or P23 stock raise Y+.38. Both rails must remain connected to pad and hinge; large negative-space frame remains.

## Immutable gameplay and style
- Factory/suppressor muzzle endpoint X19.50; barrel axis Y0, barrel width 1.24, FNC_P1 compatibility IDs, family caliber/feed/capacity, support-hand X extents and weapon physics remain unchanged.
- Shared AR 20/30/poly and legacy FNC saved magazine ID retain unchanged physical outlines and capacities, only their FNC-specific placement changes.
- P28 536 triangles/23 meshes target unchanged. No extra screws, bevels, handguard strips, or separate shell.
- Shape change must be visible at normal Workbench zoom; compare real WebGL side, opposite-side, and 3/4 views with FAL/G3A3/M16A2/M4A1. Keep horizontal mass/width intentional; avoid a thin or realistic replica.

## Acceptance and legacy tests
New `tests/weapon-fnc-p29-vertical-proportions.test.mjs` proves bounds, sight/handle intersections, new receiver wall height, mouth clearance for all four compatible IDs, polymer/gas intersections, retained 12 vents and two gas marks, stock connections, unchanged family geometry budget and gameplay datums. Earlier P14–P28 regression checks with hardcoded formerly oversized Y/X constants must be updated **only** where they contradict approved P29; keep all connectivity and art-material assertions and don't drop tests just to get green.

Complete P29 as staged feature-branch commits, one release batch and a verified Pages deployment when previous release is healthy.
