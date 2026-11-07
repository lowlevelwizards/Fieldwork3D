# PASGT P7 — audited finish-pass build specification (2026-11-07)

## Scope and source ownership
This is an art-first, PASGT-only visual revision against P6 `ac2989a`, on the `feature/pasgt-p7-finish-20261107` feature branch. Do not modify ballistic coverage, character collision, saved appearance schema, animation transforms, facewear mask exclusion, lighting pipeline, or other helmet families. Existing P6 silhouette and customization remain the fallback.

Source ownership: `operator-headwear-silhouettes.ts` owns the shell; `operator-pasgt-drape-geometry.ts` owns cover/UV topology and slit attachment frames; `operator-pasgt-cover-texture.ts` owns cut-panel texture and seam ink; `operator-pasgt-field-dress.ts` owns cards, ribbons, net, chin retention, and slit shading; `operator-pasgt-cover-policy.ts` owns effective accessory dependencies; `operator-pasgt-cover-visuals.ts` binds the same fabric to all cover-relative details.

## Nonnegotiable style constraints
- Deliberately chunky, stubby, representational, flat-shaded miniature. No spheres, subdivision surfaces, thin stitching meshes, tiny bolt forests, full PBR, or new gameplay hitboxes.
- Retain the oversized forward brow, deep rear skirt, temple/ear coverage, and recognizable frontal mass. Source dimensions are head-local game units, not physical centimeters.
- Unique detail geometry must contribute a clear shape in mobile 3/4 and side views; no adding faces merely to increase polygon count.
- No random changes between frames or load/replay; attachment layout is authored. Do not create/modify textures or geometry per render frame.
- All source preferences remain unchanged; dependencies are **resolved** values. Net => effective elastic band; foliage or scrim => effective foliage slits. If a user selects concealment 'none' restore explicit prior band/slits values. Do not force an elastic band when net is hidden because the cover is hidden: effective band is preference-based unless net visibly present.
- Cover-less shell may display an explicitly chosen band, but concealment is only shown on fitted cover. If current input selects net with no cover, do not silently mutate user preference.
- Only two functional side suspension screw pairs where plausibly visible on the uncovered shell; no invented front/rear rivet rows. Hidden under cover.
- Material hierarchy: cloth .97 rough; slit = sampled cover print * .82–.88, fully opaque; hardware muted and low contrast; straps coarser than stitches.
- Neutral/plain cloth must remain well lit. Printed camo has identical physical texel pitch across three panel islands. More visible mismatching is a **phase change**, not an atlas scale/UV stretch.
- Seam join: exactly two physical runs, no ghost seam on opposite side, extend from forward apron through full crown to rear apron before the band; pixel shading, not extra rope geometry.
- For foliage: retain 10 clusters of 3 large cards; crown cluster main axes lean at least 25° from world vertical and biased radially outward; perimeter placements aim outward and downward, with only secondary tips rising. No face-blocking front curtain.
- Scrim: retain ten chunky two-panel strips; weighted downward against exterior fabric and outward beyond lip, not rotating freely. Roots coincide with existing slits. No folded piece crosses through shell due to initial bend inward.
- Net: six broad diamonds, contact with shell/crown, ends tuck behind band rather than truncate into air; no second floating band. Effective band auto-on.
- Chin: preserve V profile and facewear suppression. Add only an intentional shallow chin cup inset and limited central accent. Do not expand straps into jaw armor.
- Top silhouette audition: test modest <= 0.4 world-unit top inset and no more than one major chamfer per top corner (not every edge), with cover following shell. Only promote after front, rear, and 3/4 captures show no false air gaps or sharp spikes.
- Lower hem: current fabric ribbon may be subtly thicker (0.14→0.16–0.20 game units) but must not become a second elastic band. Keep shell edge treatment independent.

## Audited implementation batches
P7-A (construction & dependencies): effective band/slits policy; make slot color share the exact same print instance with a constant color multiplier and matching planar UV; extend top-to-apron seams and increase deterministic panel phase (not scale); better net termination. Focused node tests for saved/raw settings, atlas positions, geometry metadata, 12 slit anchors and 6 net paths.

P7-B (concealment readability): author a radial surface-relative foliage frame and a gravity-informed scrim frame; bounded 10-element tilt and twist arrays, no per-frame RNG; verify each attachment returns to its slit, card normals are stable, and no front collision with the face/eye silhouette in front/side mobile views. Test both woodland and desert at 3/4, sides, and rear.

P7-C (shape & final detailing): two silhouette auditions—current vs one inset/chamfer version—then subtle lower-ear flare if needed, modest chin cup and visible uncovered shell fastening treatment. All covering fabric must follow changed silhouette. No blanket updates to ACH/high-cut. Build candidate with existing rendering; regression against P6.

P7-D (integration/release): `npm run build` and focused `node --experimental-strip-types --test tests/pasgt-*.test.mjs`; representative Operator Studio mobile screenshots with none / solid / woodland / desert / foliage / scrim / net and front/side/rear; no scene load regression. Merge only a coherent tested batch after current main Pages run completed and public Pages build stamp matches expected SHA; no merge if another workflow is queued/running. Don't merge unrelated draft PRs.

## Audit corrections vs initial design
- **No guessed literal 6–10% chamfer**: source width already spans 9.78 with cover geometry offset; audition small local inset at crown vertices and preserve cover contact.
- **No global material alpha for dark slots**: opacity changes introduce sorting/readability failures. Derive shade by mapping the same printed atlas and multiplying RGB.
- **Do not change UI saved values when enabling net**: avoid silent loss of 'band:none' choice.
- **No extra dense net mesh**: the existing six paths are visually successful; fix only endpoint behavior.
- **No universal hardware across covered helmets**: attachment points should disappear when fabric is present.
- **No expensive universal helmet rewrite**: PASGT first; share fit/material principles later by deliberate per-family reviews.

## Promotion gates
P7-A/P7-B/P7-C commit independently to the same feature branch. Review each stage head. Critical tests only. Keep PR draft while mobile visual inspection or source-specific checks are incomplete. Do not claim visually approved or deployed merely because source tests pass.

## P7 release preflight enforcement
The P7 branch's focused GitHub Actions gate includes `scripts/audit-pages-release-checkpoint.mjs`. It fails closed if a previous main Pages release is still queued, last deployment fails, the deployed SHA differs from main, or public `fieldwork-build.json` does not identify the latest main commit. Preserve the prior successful P7 mobile visual runs and release as one coherent PR merge, never one deployment per stage.
