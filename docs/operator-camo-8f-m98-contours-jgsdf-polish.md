# Camouflage 8F — organic M98 contour system and restrained JGSDF polish

Baseline: 8E public release `d3b4874`. Release branch:
`feature/operator-camo-8f-m98-contours-jgsdf-polish-20261105`.

## Why another pass

User screenshots from 8E show huge flat green/tan fields across M98 thighs
despite an attractive overall three-ink balance. The 27 stacked polygons were
balanced over the complete 64px master but a 10–20px garment crop could still
look like a solid color. More arbitrary overlay patches would repeat the
original problem. For JGSDF Type II the small-cluster generator was successful
but reddish brown and high-value khaki remained too assertive. Soldier 2000 is
accepted and explicitly frozen.

Historical visual direction: Norwegian M98 has broad rounded patches with
soft turns and occasional short straight joins, not Swedish M90 triangles or
small digital flecks. JGSDF Type II has layered moss, tan, rust and dark small
vegetation groups. Reference review included Joint Forces M98 field photography
and period Japanese Type II fabric photography; this is independently coded
stylization rather than a copied bitmap.

## 8F-A — replace M98 composition, preserve game conventions

Replace the 8E authored 27-polygon atlas, **not** the material or UV
pipeline. An immutable once-cached 64×64 indexed master is built from three
competing smooth, periodic ink fields, each with a locked seed and three
frequencies:

| Octave (cycles over 64px) | Weight | Visual role |
|---|---:|---|
| 5 | 0.43 | broad M98 sweeps |
| 10 | 0.50 | rounded, interlocking medium lobes |
| 17 | 0.07 | fine contour bends, **not** speckle pixels |

Cubic easing between periodic integer lattice samples prevents random-chip
noise and seamlessly joins tile boundaries. Each indexed pixel is assigned
whichever ink has the greatest field value; no new palette colors.

Keep existing M98 palette and garment density **2.55** initially.
M98 must have approximately balanced global three-color coverage **and**
no solid 12×18 atlas crop; this is a more meaningful textile test than
global coverage alone. This is one-time master generation only; seeded cloth
placement/repeat remains unchanged.

## 8F-B — JGSDF polish only

Retain 8E's 100 jittered smaller fleck families and existing UV scale 3.2.
Slightly mute rust from [136,83,74] to **[127,96,84]**, and khaki from
[187,185,150] to **[179,181,149]**. Increase the relative probability of
green fleck families by changing thresholds .43/.62/.81 to **.47/.61/.81**.
No new large parent blobs and no secondary all-over spot shader.

## 8F-C — freeze Soldier 2000

There are **no art or material changes** to Soldier 2000. The 8E 64px
RGBA pixel SHA-256 is
`4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9`.
The 8F test requires byte-for-byte identity, including palette, before merge.

## 8F-QA — focused automated + mobile WebGL

- `tests/operator-camo-batch8f.test.mjs`: all 54 IDs, M98 global coverage and
  sliding toroidal 12×18 cropped-panel dominance, color count, M98 ink-edge
  complexity, JGSDF subdued rust/khaki, exact 8E Soldier 2000 RGBA SHA, 5
  fixed cutting seeds and metric nearest-neighbor material repeat.
- Run relevant 8E/8D/8C/8B/8A/7C tests and R9 texture density, plus TypeScript
  and Vite production build. No comprehensive gameplay suite.
- Reuse existing Camouflage Mobile Print Review workflow. For 8F branches,
  `capture-operator-camo-8f.mjs` writes 3 raw index-master PNGs and 18 mobile
  BDU operator shots: front/side/back × detail/gameplay × 3 patterns. Confirm
  visible M98 garment crops are more varied than 8E screenshots, JGSDF remains
  recognizably dot-clustered and Soldier 2000 visually identical.
- Keep all three selected original IDs, actual garment cutting, old saved
  looks, armor, gear, headwear, and six outfit channels unchanged.

## Stage and release checkpoints

1. Commit M98 shape rewrite as 8F-A.
2. Commit JGSDF micro-polish as 8F-B.
3. Commit frozen-image tests, captures and documented acceptance as 8F-QA.
4. Verify one focused CI check and one WebGL capture workflow; resolve failures
   on the feature branch, no intermediate main merges.
5. Check that current main deployment succeeded and its exact SHA is served
   publicly by Pages; reconcile any newer main change before merging.
6. Merge **once** when critical checks are green and no Pages deployment is
   queued/running. Verify resulting production deployment and public SHA.

Retain a separate local art-review checkpoint: passing crop and color metrics
is not proof of historical or visual perfection. The operator front/back
screenshots remain decisive for follow-up aesthetic judgment.
