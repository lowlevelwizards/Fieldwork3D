# Beretta D3 — iconic silhouette corrective pass (2026-11-20)

**Status:** Scoped art-only geometry pass on existing `beretta-m9` and `beretta-m9a3`, based on screenshots from the live build after PR #1892. Governed by [Universal Weapon Art & Production Standard](weapon-production-standard.md). This document specifies targets, not a claim of visual sign-off.

## User reference failures
1. Classic grip still too upright and slab-like.
2. Exposed barrel too thin; open Beretta slide insufficiently expressive at playing scale.
3. Rear slide serrations stop well short of upper and lower edges.
4. Guard still too rectangular; oversized lower front dust cover and muzzle block.
5. Hammer/decocker, grip-panel integration, variant silhouette differences, and rear sight can read more coherently.

## Prioritized shape decisions / exact art datums
All values are symbolic local art units, not physical firearm dimensions.

| Datum | Prior M9 | D3 M9 | D3 M9A3 |
| --- | ---: | ---: | ---: |
| Heel Y | -8.90 | -9.04 | -8.87 |
| Heel rear X | -9.30 | -10.21 | -9.34 |
| Heel front X | -4.76 | -5.54 | -5.15 |
| Barrel center Y | 2.58 | 2.46 | 2.46 |
| Barrel faceted radius | .70 | .88 | .88 |
| Lower frame dust-cover nose X | 7.68 | 6.71 | 6.71 |
| Guard opening upper Y | -1.37 | -1.27 | -1.27 |
| Guard opening lower Y | -3.15 | -3.18 | -3.18 |
| Lower rail roof Y | 1.76 | 1.61 | 1.61 |
| Serrations lower/upper Y | .95 / 2.76 | .405 / 3.125 | same |

- **D3.1 Large silhouette**: rake both front/rear heel points backwards; give classic heel extra sweep/width, preserve straighter Vertec shape on M9A3. The panels use the variant's actual heel coordinates, not constant floating trapezoids.
- **D3.2 Barrel and upper**: six-facet barrel enlarged by 25.7%, moved slightly downward, low rails reshaped to uncover the cylinder from side and top; bevel-like transition at front of solid rear slide; one slim, low nose bridge and inset dark crown. No full-width top cap or false painted open channel.
- **D3.3 Guard/underside**: enlarge a physically open 10-point guard, round by broad angular steps (not smooth high-poly curves); dust cover shorter and tapered, proportionate to Glock shared-scale upper.
- **D3.4 Rear cues**: shorter hooked hammer, smaller sights, side-correct oversized decocker paddles. Four bold full-height angled slide marks per side, kept in one indexed mesh, not 8 draw calls.
- **D3.5 Variant contrast**: M9 dark steel, swept curved heel, no rail. M9A3 coyote slide/frame, straighter grip, rail and extended barrel. Variant differentiation is geometric, not recolor-only.

## Explicit non-goals
Do not add issued Beretta IDs, live firing, ballistics, reloads, magazine compatibility, operator pose changes, extra decorations, firearm mechanical assembly, new preview renderer, per-frame allocations, or a new customization system. Keep current viewer and saved Glock authority untouched.

## Required acceptance
- Side, opposite, three-quarter, top and front inspection; validate same-scale Glock visual parity and Beretta family read at 64/128px and phone/desktop.
- Source geometry tests must prove physical negative spaces, actual barrel radius, integrated panel contacts, and serration vertical coverage in real BufferGeometry.
- Keep approximately 12–18 meshes and target <=420 measured emitted triangles per factory model, with documented exceptions only if necessary to preserve the silhouette.
- Focused gate: Beretta/Glock geometry, TypeScript/build, existing mobile/desktop browser smoke and image captures; critical integration gate; no other nonessential Actions runs.
- **Release rule:** do not merge until current exact-head tests pass, previous Pages release succeeds and deployed build matches main; after merge verify exact new live build.
