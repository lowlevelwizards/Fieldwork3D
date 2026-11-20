# Beretta D7 — surgical silhouette rebalancing

**2026-11-20 · Fieldwork Breach / Fieldwork3D · art-only M9 and M9A3**
Reference: user-supplied post-D6 iPhone side, front/quarter/top, underside captures in the project discussion. [D6 art contract](beretta-d6-iconic-silhouette-surgical-spec.md); [universal weapon art production standard](weapon-production-standard.md). Core goal: **chunky / stubby / simplified / exaggerated / representational / toy-like authenticity, with the lowest meaningful triangle count**.

## Priorities and precise edit contract

1. **Front wrap:** Retain **one** `m9UnifiedFrontShell` mesh and twelve cross-section vertices. Replace flat vertical outer cheek shoulders with faceted/chamfered sloping sides (outer Z 1.55→1.35 above Y2.94); lower U floor ≈Y1.12, inner channel remains open, barrel clearance ≈Z±1.07. Taper roof shoulders inward **5.5%** toward the front, retreat lower front face **0.17 art units** without adding mesh faces. Bridge Y3.38–3.58 is short (X nose−.54→nose+.08); short integrated sight rises to Y3.88. Retain 6-facet barrel and flat 6-triangle dark muzzle face, visible barrel overhang classic .33 and A3 .76. The section should read like one cast toy silhouette, not separate posts, a floating sight or a square bracket.
2. **Hammer:** Replace D6's seven-vertex vertical antenna with **nine silhouette stations** describing a broad, short, rearward-curling hook. Crown ≤Y4.02 (previous 4.13); greater 2D head depth across X (~.96 rather than .66); thinner in Z (1.04 rather than 1.16). Still extruded as ONE mesh, no ring detailing, no operable mechanism.
3. **Grip panels:** Preserve one indexed 18-triangle, two-face panel batch. Reposition the **same five stations** per variant: classic M9 leans visibly farther rearward from top to heel; A3 remains noticeably straighter Vertec. Upper panels around Y−2.12, heels inset from physical grip boundary; no additional panel bevel or micro-texture. Maintain the existing dark tonal contrast and connected magazine plate.
4. **Beavertail:** Replace the long triangular shovel point with a **blunt two-facet swept tang** in the existing frame outline: tip X≈−11.40, a short vertical offset around Y−.24 and upper return around X−11.12,Y−.08. One extra meaningful profile point; retains approved projection/length and connected frame.
5. **Rear upper slide:** Eliminate abrupt rectangular front break by shifting front underside to X−.98 and adding an intermediate facet at X−1.30,Y2.63 before the crown at X−1.72,Y3.17. Reuse the existing upper extrusion and D5 roof taper. One extra purposeful contour station, no additional object.
6. **M9A3 rail:** Replace its under-frame floating cuboid with a **six-station extruded frame-following profile**: embeds at Y−.61, projects to Y−1.10, slopes at both ends, X2.80→6.20. Remains one A3-only mesh, no ornamental tooth or slot geometry. Classic M9 remains smooth/unrailed.

**Deliberate exclusions:** No trigger (explicitly requested), no gameplay issuance/ballistics, no new family or attachments, no new renderer, no save migration, no micro-pins/screws/textures, no camera/orientation regression (all previews default side, as delivered in D6).

## Geometry budget and visual gates

D6 measured on actual production output: **M9 352 triangles / 14 meshes; M9A3 364 triangles / 15 meshes**. D7 should retain these mesh counts. Small additional triangle expense is acceptable **only** for altered grip-independent iconic silhouette: curved hammer, blunted tang, rear upper transition, integrated A3 rail. Initial upper caps are M9 ≤380 triangles, A3 ≤400; tighten to measured totals after CI. Compare emitted, not metadata, polygon counts.

Required real WebGL captures: 390px and desktop side/opposite/quarter/top, both variants, plus 64px/128px recognition beside a Glock G19 with identical lighting, fit and scale when possible. Reject if nose still resembles posts or the barrel disappears, if hammer looks like an antenna, if grip panels become upright patches, if A3 rail looks unconnected, or if front/rear shadow discontinuities worsen. Maintain open slide, physical trigger-guard void, visibly protruding barrel and rail distinction in clay mode.

## Release policy

Feature branch staged commits A muzzle/hammer; B grip/tang/upper slide/rail; C exact-hit regression tests and art acceptance. No main merges until final relevant art gate/browser and critical integration runs pass. Reconcile other work on main. Before merge verify latest Pages success and live stamp match main, no Pages run active. Squash at one release checkpoint; confirm new public build stamp. If Pages artifact metadata delay occurs, check registry and retry failure instead of stacking deployments.
