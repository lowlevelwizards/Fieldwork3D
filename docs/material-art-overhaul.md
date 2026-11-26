# Material Art & Weathering Overhaul (MA0–MA9)
Base: 8d685d2bee24d5f84b592e34ed15897a8ec87d6a. User screenshots of the deployed lab confirm that raw motifs are placeholder-like: repeated lines, rectangular stains, broken cracks, noisy masks, weak material identity. Screenshot build stamp verifies this previous release was served to the user, not necessarily the current public build.

## Art contract
- Bold graphic clusters; coherent silhouettes with 2–3 nested tones; sparse, intentional negative space; no indiscriminate pixel noise, PBR realism, or arbitrary universal grime.
- Distinguish substrate/coating, material palette and physical structure before aging. Preserve clean surfaces; age is context, not blanket brown tint.
- Weathering grows within existing causal anchor bounds and event budget, with stable variant identities, legible direction, material-specific color, no frame RNG, no geometry/collision/fog changes.
- 0 wear equals clean, effect thresholds respected; preview isolated and combined at 0/25/50/75/100. Compare real production at actual atlas resolution and an explicitly labelled density candidate; gameplay-distance witnesses required before promoting density.
- Preserve shared atlas, trim swatches, batching, material ownership, opaque linear-light mixing, mip guards and disposal. Never add a draw per effect.

## Release batches
A: MA0 inventory/art contract, MA1 lab UI and audition controls, MA2 resolution experiment, MA3 architectural material art, MA4 wall effect artwork. Initial production density remains unchanged until measured.
B: MA5 local mask variants, MA6 floor finish and deterioration, MA7 fixtures/exterior, MA8 contextual progression/composition. Audit consumers and preserve dimensions, alpha contracts and semantic placement.
C: MA9 actual building/gameplay-distance review, performance verification, consolidation. Review missing 3D specimens, room corners, palette choices and fixture/floor gallery; do not claim complete without these and real-browser evidence.
Each stage gets a separate commit; compatible stages grouped at release checkpoint. Critical tests only: deterministic pixel/threshold/clean contracts; typecheck/build; targeted browser smoke where possible; check no new render draws. Before merging, verify previous Pages deployment and public build stamp; do not queue merges during active publication. Repair failure rather than pile on. Existing deploy gate remains intact.

## Inventory
- Wall faces: plaster, banded plaster, brick, cinderblock, concrete, tile, metal panel, siding. W3 atlas 24 face rows per 64-row strip; widths 64/128/256. W2 packed and legacy comparison paths retained.
- Wall causes: fade, contact, chip, damp, runoff, crack, repair, moss, rust, grease, splash, workgrime. W6 fixture story and W3 causal anchors own eligibility.
- Shared pixel recipes: PIXEL_SURFACES registry (wood, mineral, textile, metal, plastic, sanitary, rubber, outdoor); raw white modulation is not final gameplay color.
- Local wear: 20 masks in pixel-decals.ts; floor weathering W7 atlas and conditionFloorPixels; fixture and outdoor wear consumers to audit before Batch B.
- Current lab shows authored witness pixels, not proof of generated placement; no actual GPU performance measurements yet.

## Rolling checkpoint
Batch A: PR #2026, e6a1b729. Focused Material art critical checks run 45740701221 succeeded. MA2 candidate density remains lab-only; no production memory increase. MA1 includes a schematic lit specimen using tactical light constants; full generated-building context and actual fixture models remain MA9. Batch B carries MA5 twenty masks (four variants, floor atlas uses per-mark deterministic selection; legacy/fixture GPU masks keep one texture per kind), MA6 floor broad art and base patterns, MA7 shared material patterns and fixture finish tints, MA8 stable object wear, contextual moisture alignment and new floor/fixture sample galleries. No new production scene meshes or texture slots. Artistic approval and full generated-building performance evidence are still outstanding. Local environment cannot resolve GitHub; public build JSON could not be retrieved with web. User screenshots show preceding build 8d685d2 served; do not assume a later deployment is verified.
