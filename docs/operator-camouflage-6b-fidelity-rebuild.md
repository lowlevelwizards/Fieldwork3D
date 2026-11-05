# Camouflage 6B — reference-led visual rebuild

Date: 2026-11-04. Scope: preserve the eight identifiers and all cosmetics saves introduced by 6A; replace only authored print artwork / scale choices. Existing 30 patterns are frozen.

## Diagnosis
6A gave all eight patterns one generic, percentile-sorted smooth-noise generator. Colors were assigned by a numerical score. Polygon markings were merely biases and often did not survive as authored recognizable shapes. The new renderer uses immutable ink regions and optional family-specific pixel breakup, with no ranked-noise palette assignment.

## Pattern families and code construction

| Pattern | Closest existing relatives | Reference visual signature | 6B implementation |
| --- | --- | --- | --- |
| MultiCam Tropic | MultiCam, OCP / Scorpion W2, MTP | Shared MultiCam motifs, forest/olive with deep shadow and tiny lichen highlights | **Exact original MultiCam 32px index map expanded 2× to 64px**, palette changes only; density doubled to maintain identical physical scale |
| MultiCam Arid | MultiCam, OCP / Scorpion W2, MTP | Shared MultiCam motifs, warm pale desert ground and subtle earth accents | **Same exact index map** as Tropic and original MultiCam; distinct sand/cream/camel palette; same scale |
| Ukrainian MM-14 | UCP, MARPAT, EMR, CADPAT | Broad interlocking gray/sand/olive digital shapes with thin stepped breaks and dark charcoal details | Independently authored interconnected light and medium masses with short 2px digital steps, dark branching accents; cooler greige hues |
| AOR2 | Woodland MARPAT, CADPAT TW | Dense green pixelated woodland, irregular dark tendrils, vertical tendency without uninterrupted bars | Distinct multi-directional lobe masks and nested short pixel breaks; dense dark ink, no long stripe synthesis |
| AOR1 | Desert MARPAT, UCP | Tight, warm four-color desert digital with numerous broken 1–3px accents | Fine interlocking sand/coyote shapes, chocolate fragments, 2px digital baseline and 1px chipped corners |
| A-TACS FG | A-TACS AU, Polish Pantera, M05 | Foliage and earth micro/macro organic structure; mottled transition regions, no fixed directional stripe | Original hand-placed foliage/earth masks with deterministic *edge-only* erosion and confined lichen texture; separate drawing from AU |
| A-TACS AU | A-TACS FG, desert 3-color | Organic arid stone/khaki/ochre micro/macro structure; subtle low-contrast field transitions | Original arid masks independent of FG, with purposeful chipped stone contours and small shadow pockets |
| SS-Leto / Partizan | Mitchell leaf, Alpenflage, ERDL | Recognizable lobed oak-leaf mass clusters and dark outlines over olive/ochre | Explicit lobed oak-leaf polygons, paired holes/notches and clustered punctuation; no generic leaf-biased noise |

## Art constraints
- Preserve Fieldwork's 64×64 master pixel size for 6A and stable per-operator cut phases.
- All final texture bytes remain opaque RGB, nearest-filtered and physically scaled in the existing shared cloth / UV1 renderer.
- Preserve original 30 camouflage masters, color tables, headwear eligibility and Gorka outfit eligibility. No gameplay mechanics or equipment changes.
- MultiCam source has 32×32 original pixels. Each original ink pixel occupies 2×2 in its 64×64 6B variants; density 4 rather than 2 yields the *exact* physical motif dimensions of the source. Do not introduce new ink shapes into Tropic/Arid. Alter only their seven role-matched colors.
- AOR and MM-14: retain coherent shapes as ink masks. AOR masters use 4px/world-unit density so their 64px art spans 16 world units, matching MARPAT's 32px at 2px/world-unit; MM-14 keeps larger digital masses. Small pixel fragments can interrupt/extend the masks, not replace them with uniform noise.
- A-TACS: represent a photographic micro-to-macro relationship through authored foliage/stone regions and **limited** deterministic boundary erosion. FG and AU should *not* share the exact print layout, unlike the MultiCam family.
- SS-Leto: leaves must retain recognizable lobes at garment and gameplay zoom.
- Avoid direct copying/scanning of proprietary fabric artwork; all non-MultiCam fields are original stylized approximations.

## Source comparisons
- Original A-TACS references: https://www.a-tacs.com/ ; A-TACS FG official history: https://soldiersystems.net/2022/07/27/original-a-tacs-fg-is-back/
- A-TACS construction overview: https://www.swatmag.com/article/military-camouflage-options/
- Ukrainian MM-14 printed textile: https://rockywoods.com/products/500-denier-mil-spec-cordura-nylon-fabric-ukrainian-armed-forces
- AOR2 detailed print: https://repmart.jp/user_data/htm/guide/camo/aor2.jpg
- MultiCam-family styles: https://multicampattern.com/ ; verify original design language and seasonal palette roles
- SS-Leto commercial/surplus leaf print comparisons: distinguish lobed large forms from Flecktarn spots and from Mitchell leaf shapes.

## Critical acceptance
1. Typecheck and compile. Old 30 patterns and 38 total IDs unaffected.
2. 6B unit tests: exact MultiCam indexed topology and physical period; digital breakup in both directions; A-TACS distinct shape maps; no percentile-sorted universal generator; stable UV headwear and fabric pixels.
3. Headwear, wardrobe persistence and fabric policy regressions.
4. Mobile Studio smoke and representative real WebGL render where available.
5. Release only after previous Pages success, one checkpoint and public build stamp verification. Do not queue deployments when previous release is pending.
