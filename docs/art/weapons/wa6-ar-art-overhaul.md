# WA6 — AR-family artwork overhaul
## Scope
Nine factory references (including the labeled C7A2 proxy), associated custom parts and representative equipped cases. Art-only; no gameplay, compatibility, part IDs, handling, contact/mount data, or functional design changes. The WA0 audit identifies busier repeating relief, stacked-looking junctions, and weak dark-substrate distinction relative to the newer art benchmarks.
## WA6.1 — shared visual economy and material calibration
Preserve the established major variant silhouettes, open frames, distinctive furniture, and existing finish identities. The old repeated decorative relief used separate box segments; replace those with one continuous low-poly band mesh following the authored exterior. Retain the established number of bands per variant and the angular character; remove hidden backs and individual segment seams. This is an artistic simplification only. Cooler steel and warmer neutral polymer use scoped registry entries; preserve FDE, magazine finishes, and unrelated families. Keep the actual black-grip swatch consistent with its rendered material.
## Validation and follow-through
Compare actual rendered panels and operator context with pinned WA5; report emitted triangles including instances and exact unrelated-family parity. Preserve true variant differences; do not assert that the entire AR overhaul is complete based on geometry economy alone. WA6.2 review the new bands and material relationships at close-up and native scale, evaluate remaining decorative rail clutter and visual junctions, and retain or revise based on actual paired evidence. No blanket simplification of silhouette-bearing forms. Existing compiled factory cases must be rechecked under their existing art-only compiler gate.
## Verified WA6.1
Run 45758436014, artifact 15088714097: 13 AR cases changed, 88 unrelated exact, 1,440 aggregate emitted triangles removed across 5 relief cases, 146 paired views and 54 identical PNGs. Reviewed side and three-quarter comparisons of all nine factory models: cleaner contiguous band treatment, retained variants and warmer furniture, cooler receiver. Remaining findings: the pale metal magazine and dark polymer-colored lower receiver compete with the primary silhouette. Retain rails for their identity, avoid uniform thinning or unnecessary ornament.
## WA6.2/3 — graphic detail and structural readability
Replace separate decorative metal magazine relief meshes with one opaque shared 64px-tile atlas on the original body, using existing authored graphic shapes and neutral edge faces. Preserve the body geometry, polymer toe and legacy shared FNC materials. Calibrate the metal magazine to a quieter cool-neutral and distinguish the lower receiver/rail base as dark steel, retaining established exterior geometry and configuration data. This is visual-only; verify before/after actual renders and no unrelated changes. Further shape rebuilding is not justified unless actual evidence shows a remaining defect. Status: WA6.2/3 candidate committed; incremental verification and visual review pending. No merge or deployment.

## WA6.4 — cross-variant review checkpoint
Reviewed the verified WA6.1 actual side, three-quarter, fitted 128px and Operator Lab side/game-view captures of all nine factory references (artifact 15088714097). The images below are relative assessments of artwork, not physical specifications or new configuration proposals.

| Reference | Retained identity | Review finding |
|---|---|---|
| M16A1 | Long, angular classic silhouette | Broad shapes read clearly; no need for further geometric detail. |
| M16A2 | Rounded furniture and long silhouette | Continuous decorative bands improve coherence; material hierarchy needs WA6.2 review. |
| M16A4 | Modernized long silhouette | Rail pattern is readable; retain visual distinction from other long variants. |
| C7A2 proxy | Distinct mixed-era outline | Remains labeled proxy; not a new historical authenticity claim. |
| Mk12 Mod 0 | Long smooth front mass | Quiet fore-end and recognizable top contour; retain distinctive visual identity. |
| CAR-15 | Compact retro appearance | Cleaner broad bands; retain its contrast with the longer models. |
| Colt 733 | Related compact appearance | Subtle distinction at small size; avoid inventing features to force a stronger contrast. |
| M4A1 | Compact modern profile | Strong family recognition; review WA6.2 lower mass and graphic contrast. |
| Mk18 | Short modern profile with contrasting tan | Color and proportions distinguish it well; preserve the finish identity. |

WA6.1 factory aggregate: 6,910 → 5,706 emitted triangles (1,204 removed, 17.4% across the nine default references). The 1,440 total includes a custom case. Operator Lab captures establish that broad silhouette and color masses dominate at that framing; they are not live mission frames and cannot establish full gameplay material acceptance. No additional geometry changes justified by this checkpoint alone.

At ce621f0d89ec8a20ef68ba3c8c55d1361727e297, run 45759896200 has passed typecheck, focused integrated artwork tests, full-catalog and incremental structural comparisons; actual before/after WebGL capture remains in progress. Do not mark WA6.5 complete until the artifact is available and reviewed. Final weighted grades remain unassigned; full accessory and game-context reviews remain WA12/15/16. No production release authorized.

## WA6.5 verified checkpoint
Run 45759896200, artifact 15089696839, candidate ce621f0d89ec8a20ef68ba3c8c55d1361727e297: 13 AR cases, 88 unrelated exact, 2,056 aggregate emitted triangles removed (616 additional vs WA6.1), 22 additional mesh objects removed, 146 matched views and 54 identical panels. Reviewed final nine three-quarter paired images: quieter graphic contrast and coherent material hierarchy with retained variant character. Dedicated technical acceptance passed; author review complete, final human sign-off and live mission review remain outstanding. No deployment.
