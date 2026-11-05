# Fieldwork Camouflage 8A — International & Specialist prints
**Scope:** add precisely eight 64×64 authored seamless pixel-textile masters, retaining all original 46 print IDs and stable saves. **Release grouping:** four pattern-pair commits + integration and QA, one production deployment. Source: November 2026.

## Art philosophy — carry forward proven construction, not generic randomized blobs
All eight use the existing Fieldwork recipe/ink-index pipeline, 64×64 masters, nearest-neighbor texels, single source for headwear/garment/rig, deterministic variation from seed/UV, no scanned image maps. New colors are art-directed estimates, **not measured military color codes**. Preserve hard pixel shapes, the 7C pea-dot scale conventions, and per-family architecture. Each print should survive an 80px swatch, full operator jacket/pants, and combat zoom.

| Print / saved ID | Nearest existing neighbors | Distinctive construction & palettes | Failure case / acceptance |
| --- | --- | --- | --- |
| Russian Izlom / Skol `russian-izlom` | Flecktarn, JGSDF Type II | Hand-authored angular 'lozenge' mosaics on forest black-green with 4 supporting green/russet/tan inks; layered fracture-like small notches; fleck field coverage, **not** Flecktarn round spots | Must read like angular cousin of Flecktarn, visibly different shapes; warm tan/rust elements present |
| Greek Lizard `greek-lizard` | Tiger Stripe, Russian Flora | Broad but *thin* broken horizontal olive/brown/charcoal brushstrokes over sage-khaki, overlapping tapered ribbons with occasional painted stipple; periodic rhythm and diagonal lips | Horizontal layered/scratchy; not bold vertical tiger bands or solid broad paint swathes |
| Urban Kamysh `urban-kamysh` | Tiger Stripe, Greek Lizard | Reuse horizontal stroke authoring, with **independent** ragged tiger/reed silhouette. Blue-gray, mid-slate, light gray-blue, ink-black. Wider linked black strips and contrasting pale negative spaces. | At swatch size recognizable urban blue tiger pattern rather than Greek Lizard recolor |
| JGSDF Type II `jgsdf-type2` | Flecktarn, Tropentarn, Izlom | Rounded, dense lobe/fleck clusters over grassy medium green. Taupe, red umber, very dark charcoal and pale olive/tan. Many short 1–3px micro speckles **associated with macro clusters**, smaller and less angular than Izlom | Must be rounder/denser than Izlom; brown and dark clusters should not dissolve into generic digital noise |
| PenCott MetroPolis `pencott-metropolis` | GreenZone and BadLands | **EXACT indexed PenCott GreenZone/BadLands 64px three-scale fractal master** with urban mineral gray, slate, ash, dirt brown, black graphite. Original false edges and macro/midi/micro hierarchy unchanged. | Do not repaint a new mask or generate flat random gray pixels; sibling recognizability mandatory |
| South African Soldier 2000 `south-african-s2000` | Woodland DPM, SS-Leto, Rhodie Brushstroke | Earth/Kalahari brown background, broad subdued grassy, pale-sage, dark foliage winding lobes, tiny 1–2px dark/pale spots inside larger colored regions. More brown ground than SS-Leto, **not** a generic 5-color woodland | Brown earth ground and sage chips visible, double-scale organic spots but no Leto-identical leaf geometry |
| Kryptek Typhon `kryptek-typhon` | Highlander | Reuse **EXACT Highlander 64px fractured angular/net index tile**; remap color roles to cool graphite, smoky slate and ash highlights. Retain the crossing broken lattice / reptilian mesh, avoid plain charcoal MultiCam. | Obvious Kryptek network at swatch and on trouser thighs, not flat black splotches |
| Norwegian M98 `norwegian-m98` | Swedish M90, M81 | **3 inks only**: broad connected rounded dark-green, olive-green and tan lobes. Organic junctions and long curving negative-space trunks; smallest structure deliberately huge. | Must look *simpler* than all other 8A prints, not M90 sharp polygons or M81 4-color branches |

## Sources used for morphology, NOT texture extraction
- Izlom vs Flecktarn shape contrast: https://strikehold.net/2017/11/14/more-russian-camouflage-modoxskol/
- Greece classic striped lizard and historical variants: https://camopedia.org/index.php/Greece
- Russia Kamysh / tiger colorways: https://camopedia.org/index.php/Russia
- JGSDF Type II / Jieitai dot: https://fareastmilsim.com/jsdf-equipment
- Hyde Definition PenCott and MetroPolis: https://www.hydedefinition.com/pencott/ and https://www.pencottcamo.com/2017/03/iwa-ur-tactical-showcases-new-pencott-metropolis-camouflage-pattern-at-iwa/
- Soldier 2000 earth-brown and spotted foliage: https://www.camopedia.org/index.php/South_Africa
- Kryptek Typhon and Highlander family: https://kryptek.com/pages/kryptek-camo-patterns
- Norwegian M98 three-color overscale: https://www.joint-forces.com/kit-camo/33505-norwegian-army-m98-pattern

## Implementation plan and commit checkpoints
### Stage 8A0 — reference-informed spec & frozen interface
Record exact IDs, label, palette role, geometry relationship, closest-legacy neighbor and *negative* identification test. Keep old 46 indices unchanged. Commit doc.

### Stage 8A1 — Izlom + Greek Lizard
Add polygon raster utility `p(tone,...xy)`, wrapped fill over 64×64 source, limited deterministic edge-detail operators. Izlom has 5 distinct ink roles with small interlocked angled lozenges (Flecktarn neighbor), Greek lizard has 4 ink roles with many tapered horizontally aligned streaks (Tiger Stripe neighbor). Commit together.

### Stage 8A2 — Urban Kamysh + JGSDF Type II
Urban Kamysh follows broad tiger-stroke architecture but *independent* source geometry and cool colors; JSDF derives Flecktarn's clustered paint idea but uses rounder asymmetrical groups and fleck-scale micro details. No pigment-only recolor. Commit pair.

### Stage 8A3 — MetroPolis + Typhon
For exact family fidelity, pass the existing 64px PenCott and Highlander `Uint8Array` indices into `camo8AIndices` without mutation or resampling; only the palette differs. Clone/copy returned indices to prevent caller mutation. Commit pair.

### Stage 8A4 — Soldier 2000 + M98
Two distinct organic family masters. S2000 = brown ground, green/sage lobe islands with intermittent small dots; M98 = huge interconnected three-color sweeping shapes, no noise. Preserve their physical periods and realistic printed-item availability. Commit pair.

### Stage 8A5 — integrate 54 IDs and actual garment material policy
Append 8A IDs to end of `HEADWEAR_CAMO_IDS`; add to `HEADWEAR_CAMO_RECIPES`, 64px size map and headwear/fabric density maps, `headwearCamoIndices()`, catalog origins and styles (extend union for Greece, Japan, South Africa, Norway), realistic headgear/garment cuts/knit/cuff colors.
Eligibility:
- Izlom: field BDU/Gorka/smock and selected commercial nylon, avoid assuming modern generic armor.
- Greek Lizard: classic BDU trousers/shirt and compatible older field garments; modern M24-specific combat shirt/armor only after separate art ID, avoid unverified printed gear.
- Urban Kamysh: old field/tactical uniform, soft hats and some actual helmet-cover fits; no arbitrary printed plate bags.
- JGSDF Type II: modern national field uniforms and representative field packs/helmets; plate rigs do not automatically acquire pattern.
- PenCott MetroPolis: verified commercial clothing and selected modular printed nylon, rigs and carriers allowed by separate cut matrix.
- S2000: South African field uniform, matching manufactured field/ruck textiles, older PASGT/boonie caps as supported; standard nylon webbing may stay Nutria solid.
- Kryptek Typhon: commercial tactical garments and selected nylon, carrier and cover cuts.
- Norway M98: Norwegian uniform/shirt and matching soft cover/pack; no indiscriminate universal plate pattern.
Restrict exceptions in `fabricCamoCompatible()` and `uniformCutCamoCompatible()`; no automatic every-print-on-every-helmet policy. Keep archives and saves stable.

### Stage 8A6 — critical QA and gated release
Run focused new 8A tests, prior 7A + 7C registration identity, garment/rig eligibility, saved-look roundtrip, no empty/palette-out-of-bounds 64px source, byte-for-byte PenCott/Typhon ink equivalence, deterministic tiles & nearest texture. Check eight distinct swatch colors and compare 80px/downscale to original neighbors. Production typecheck/Vite build and optional existing mobile Operator Studio smoke. **No comprehensive gameplay suite**.
One compatible PR/release checkpoint only. Before merge verify existing Pages run is successful and public build stamp matches its SHA. If a release is queued/running, leave branch active. If new `main` changes overlap, rebase/merge/retest. After merge wait for new Pages public stamp verification; never pile on a second merge.
