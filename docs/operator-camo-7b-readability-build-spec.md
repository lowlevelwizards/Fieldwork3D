# Camouflage 7B — Russian pattern readability pass

Date: 2026-11-04. Scope: Spectre SKWO, SS-Leto / Partizan, KLMK Berezka. **46 total IDs unchanged**. Release as a single verified Pages checkpoint.

## Art direction and reference relatives

| Pattern | Existing identity problem | Intended 7B geometry | Palette / scale |
| --- | --- | --- | --- |
| Spectre SKWO | Green-and-brown soft blobs look too similar to SS-Leto | Narrow fractured and interlocked olive corridors, angular midtone steps, dark linking branchlets, compact 2px cell chips. Small tan negative spaces and little brown. | Cooler sage/olive ink (5 colors); brown under ~12%; dark cells >8%; slightly tighten headwear and fabric pixel scale 3.0 → 3.25 |
| SS-Leto / Partizan | Overly smooth olive islands; botanical identity not strong enough | Several large, asymmetric scalloped oak-leaf forms, loam-colored underleaves, inset shadows, pale interruptions; reduce detached random micro chips | 6 original color roles, more distinct tan/loam and deep olive; keep original fabric / headwear scale 2.5/2.0 |
| KLMK Berezka | Repeated horizontal stripes look like a rigid fabric wallpaper | Staggered 8x8 sun-bunny rhythm, locally varied 3–5px bright stair-step leaflets, short forks, occasional missing pixel and olive undershadow | Same four existing color roles; original physical scale 3.2 unchanged |

### Visual reference families

- SSO / SPOSN official examples of Spectre SKWO and SS-Leto: https://sso-mil.ru/
- SSO Partizan/Leto (Russian seasonal oakleaf-inspired style), and KLMK/Berezka (classic stair-step sun-bunnies) are distinct pattern traditions. Do not collapse them into recolors of one common generator.
- Compare to the already-approved Fieldwork MultiCam Tropic, Polish Wz.93, AOR2, and Russian EMR to detect unintended resemblance.
- All shapes here are authored stylizations, not traced or redistributed proprietary fabric artwork.

## Implementation stage checkpoints

1. **7B1 Spectre** — repaint shape masks as connected geometric paths with adjacent dark interruptions; rebalance brown to accent, adjust headwear/fabric density together; commit to branch.
2. **7B2 SS-Leto** — replace only its authored 64×64 motifs, tune its six pigment roles, reduce micro-randomness, retain old print ID and garment compatibility.
3. **7B3 Berezka** — replace the rigid tile stamp repetition with deterministic per-neighborhood variation, preserving sunray legibility at a glance.
4. **7B4 integration and tests** — preserve all existing 46 IDs, outfit persistence, independent headwear/fabric rerolls, scale, color-space/nearest filtering, gear cut eligibility. Focused Node strip-types tests for 7B/6A/7A + production TypeScript/Vite build. No full gameplay suites. Mobile art comparison if affordable.
5. **Release** — complete stages on one feature branch; merge only after prior Pages deployment is healthy, no new deployment queued, and critical tests pass; verify new deployed commit stamp.

## Acceptance / rejection

- Spectre brown under 12% of its canonical 64px cloth master, olive+dark remains prevalent, structurally unlike SS-Leto and EMR.
- SS-Leto visibly includes broad tan and warm loam lobed leaves plus subordinate dark shadow notches, distinguishable from Spectre in a phone-sized swatch and on torso/trousers.
- Berezka has clearly visible pale angular sun-bunnies, enough row variance to defeat striped wallpaper, without becoming random digital camouflage.
- Headwear swatches and worn UV1 material reuse the same source colors; fabric channel uses same nearest-filtered opaque pixels and retains deterministic saved phase.
- Neither gameplay mechanics nor the other 43 pattern generators change. All existing save IDs remain valid.
