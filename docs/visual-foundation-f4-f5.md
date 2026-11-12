# Visual Foundation F4–F5 — Final color and cross-view checkpoint

## Art direction
**Graphic Tactical Miniatures**: restrained authentic finishes; distinguish built
surfaces by relative brightness, not by randomly saturated paint. Keep the three
seeded variations per building type; no authored camouflage or weapon recolors.

## F4 planned changes
1. Improve too-close wall, floor, tiled floor, trim and cap values **only when
   needed**, preserving the established architectural schemes.
2. Give room purposes a small, seeded but deterministic finish relationship
   and identify limited accent placements among already-rendered props.
3. Apply the palette to existing fixture fallbacks and selected room dressing,
   without changing generated layouts, furniture placement or tactical visibility.
4. Audit all 11 archetypes × three palettes, representative room purposes,
   color extremes and site-seed stability.

## F5 planned changes
1. Ensure the Arsenal A/B comparison keeps a fixed neutral inspection backdrop,
   key/fill lighting and renderer output while comparing the shader look.
2. Make fallback Arsenal material roles explicit; preserve physical and historical colors.
3. Verify tactical, Studio and Arsenal renderer policy, material definitions, and
   the shared F1 band thresholds with focused deterministic checks.
4. Use real browser smoke on the feature branch as a critical WebGL check, then
   review matched screenshots for ISO, director, Operator Studio and Arsenal.
   **Automated color tests are not aesthetic approval.**

## Non-negotiables
No fog-of-war disclosure, replay simulation changes, cover/collision/geometry,
saved kit changes, dynamic per-frame meshes, extra post-processing, or material
allocation loops. Restore/legacy comparisons stay available and isolated.

## Release gating
Commit each completed stage on the feature branch. Merge F4+F5 at a single
release checkpoint only after relevant critical tests succeed, existing Pages
deployment completes and the public expected build is served. Do not queue
over another production release. Inspect actual visual captures before final
art-direction signoff.

## F5 acceptance matrix and reproducible references

| Capture | Expected |
| --- | --- |
| `breach-graphic.png` | Approved graphic lighting, seeded tactical scene |
| `breach-legacy.png` | Same tactical seed using legacy A/B |
| `studio-three-band.png` | Operator and firearm, approved profile |
| `studio-two-band.png` | Same actor/camera, two-band comparison |
| `studio-weapon-glint.png` | Lit hard-surface glint only |
| `studio-weapon-no-glint.png` | Same geometry with glint off |
| `arsenal-glint.png` | Real weapon, active material lighting |
| `arsenal-no-glint.png` | Same weapon/camera with rim off |

The F5 PR workflow runs actual mobile-size Chromium WebGL to catch shader,
first-frame and A/B failures and uploads PNG evidence to the run. Review
those images manually for palette aesthetics and material/silhouette quality
before declaring final artistic acceptance. Passing smoke tests certifies the
technical path, not subjective artistic quality.

Final cross-view invariant: tactical and replay use the same live 3D renderer;
Studio and Arsenal use the same explicit sRGB/ACES/exposure configuration;
their shared approved light direction and three-band thresholds are unchanged.
Artist-approved skin and camo values remain authored source colors, not
color-corrected to match walls. The Arsenal Original switch compares with
identical neutral lighting rather than a different background.
