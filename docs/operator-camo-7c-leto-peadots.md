# Camouflage 7C — SS-Leto pea-dot restoration

Date: 2026-11-05. Small, isolated art pass on the previously approved 7B SS-Leto / Partizan oakleaf master. All 46 IDs stay stable; no changes to Spectre SKWO or KLMK Berezka.

## Visual problem and art direction

7B improved the pattern's big asymmetric lobed khaki, olive and loam oak leaves, but suppressed most small contrast chips. It looks too clean on an operator and too similar to large-scale generic woodland camouflage. Preserve **all 7B polygons and their six-color palette**, and layer 1–2px contrast marks in **existing field interiors** only.

| Existing ink | Pea-dot role | Notes |
| --- | --- | --- |
| 0 — pale khaki/tan | mostly moss green (2), rare deep shadow (5) | visually strongest near miniature garment scale |
| 1 — olive base | pale tan (0), rare shadow (5) | lively surface contrast, no broad digital blocks |
| 2 — moss green | pale tan (0), rare shadow (5) | small scattered light seeds |
| 4 — loam brown | mostly pale tan (0), occasional moss green (2) | intentionally sparser than olive/tan |
| 3 / 5 — dark shadows | no dots | preserve organic silhouettes and edge anchoring |

## Construction

- Original 7B 64×64 source is rasterized exactly as before.
- A lightweight **one-time, deterministic** pea-dot overlay runs after 7B's existing restrained edge chip pass, **only for `ss-leto`**.
- Seed candidates on 4×4 cells, jitter each mark into the cell with independent fixed coordinate hashes, then require 3 of 4 cardinal neighbors in the *original* source to share the cell's ink color.
- Place one 1px seed per admitted candidate, some adjacent two-pixel seeds, very rarely a third. Adjacent extension must stay inside the same source ink. Avoid 2×2 checkerboards and periodic rows.
- Low/medium/high thresholds in `src/operator-camo-leto-peadots.ts` are for audition and tests only. **Production uses medium**, targeting approximately 4–7% modified pixels on realistic source fields. Adjust only if visual QA requires it.
- The overlay returns a new array; the original large-field source remains unchanged, and finalized ink bytes are cached before 3D presentation. No runtime/per-frame work.
- The common headwear and fabric channels consume identical nearest-filtered RGBA swatches, existing 7B world period and deterministic UV reroll behavior.

## Rolling staged plan / acceptance

**7C1** — Author a pure seeded overlay function with low/medium/high comparisons, constrained palette and interior-only placement. Commit to feature branch.

**7C2** — Integrate medium into the existing 6A final master registry without touching other print masters or equipment restrictions. Commit.

**7C3** — Validate on synthetic fields and actual source: coverage 2.5–9.5% for medium, density monotonicity, zero changes to dark shadow pixels, original tile/seed stability, 46 IDs and saved cosmetics, same source pixels for headwear and garments. Run just 7C, 7B, 6A + production build. Commit.

**Release** — Review CI, phone Studio smoke and Pages deployment state. Merge one batch into `main` only when previous deployment succeeded and public build stamp verified. If `main` advances, reconcile rather than overwriting. Verify the new stamp after deployment.

## Visual acceptance

- From the selector tile: recognizably peppered pale and moss-green secondary flecks, no obvious repeating grid.
- From the operator's shoulder, sleeves and thighs: pea dots appear without obscuring 7B's oakleaf lobes.
- At gameplay distance: broad leaves still dominate, not uniformly noisy micro-pixels.
- Distinct from Spectre's connected stepped cells and Berezka's orderly sunray motifs.
