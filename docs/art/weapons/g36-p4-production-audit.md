# G36 P4 — production art audit and decisions

**Subject:** Original Bundeswehr-service G36 with integrated optic system, not G36C, G36K or later rail/stock upgrade. This is a silhouette-oriented art pass; no weapon mechanics, gameplay ballistics, part IDs, equipment issuance, saves or accessory behavior changed.

## Evidence and references

### Real-world primary references

- [Heckler & Koch, G36](https://www.heckler-koch.com/en/Products/Military%2520and%2520Law%2520Enforcement/Assault%2520rifles/G36): original polymer family, folding stock and modularity. Do not mistake the later Performance Upgrade Kit for the base dual-optic configuration.
- [Bundeswehr, Gewehr G36](https://www.bundeswehr.de/de/ausruestung-technik-bundeswehr/ausruestung-bewaffnung/gewehr-g36), 2019: integrated magnified and reflex sight, folding composite stock, translucent magazine; factory weapon rather than an aftermarket railed carbine.
- [US Army ODIN G36 summary](https://odin.t2com.army.mil/WEG/Asset/88b756da495ba2b5574c1133f3f37d4b), revised 2025: family distinctions between original full-length G36 and G36C, original vs rail sight configuration.

**Level of claim:** stylistically representative original G36 factory silhouette. This is not a claim of dimensionally exact historical reconstruction. Art units below are entirely local visual coordinates.

## Comparison to actual Fieldwork production builders

The factory model is built by `buildG36OriginalBlockout` in Arsenal, carried weapon, replay and operator views. The `tests/weapon-g36-p2-census.test.mjs` runs the real catalog builders for every preset. Prior *measured* reference before P4: original P2 G36 396 triangles/15 meshes; FN FNC 536/23, HK G3A3 490/24, AKM 376/23, FAL 50.00 366/26, M16A2 1126/26. These numbers are historical audit evidence, not guaranteed counts for P4; inspect fresh CI output.

- **AR/M16A2** uses an actual open carry-handle frame with a very deliberate angular shoulder; G36 must not be confused with its shorter AR handle or regular STANAG metal magazine.
- **AK/AKM** uses a recognizable receiver-cover roof, stamped body and sweeping magazine, not a continuous top G36 handle.
- **HK33/G3** uses thin metal/tube fore-end, diopter drum and comparatively slim receiver; preserve the G36 polymer fore-end and full bridge.
- **FAL** spends its shape budget on humpback receiver, bold large protrusions and characteristic furniture; G36 uses a different optic/stock/handguard triple.
- **FNC** uses a folding stock, stamped receiver and discrete sights, not a built-in long hollow sight bridge.

## Part-by-part audit / directives

| Part | Baseline issue evident in iPhone closeups and code | Implemented P4 design | Gameplay-scale priority |
| --- | --- | --- | --- |
| Original carry handle | Correct real opening but visually merged with top optic/front post; unhelpfully narrow front negative-space edge | Keep true sided inward geometry, roof and long opening; allow optics to dominate adjacent rear region without adding rails or seams | Highest |
| Dual optic | Upper reflex window and tiny rear eyepiece + separate low-facet front circle scatter faces over small footprint | Remove rear eyepiece mesh; increase major upper/lower physical housing heights, broaden upper front window and the existing lower optical face. Top elevation kept 4.70 and lower sight contact 3.57 | Highest |
| Stock frame | Rear lower strut feels like a big solid plank, despite new descending heel | Enlarge rear five-sided hole toward the lower outside edge, leave genuinely thin diagonal support and preserve two true openings, hinge and -15.05 rear contact | Highest |
| Buttpad and hinge | Rear three-quarter oversized pad and boxy connector out of scale with slender stock | Reduce buttpad X thickness and Z depth; narrow hinge while maintaining physical intersections | High |
| Receiver upper | Flat uniform black slab, little shoulder expression | Strengthen front slope and rear crown via one outline, no extra polygons for random seam decals | High |
| Receiver lower/magwell | Long stepped underbody creates unnecessary flat black assembly | Redistribute existing contour and slim the slab while retaining real mag/hand contact and open trigger gap | High |
| Grip | Simplified but generic extrusion | More intentional rake and taper using the same six-corner silhouette; no added texture or small controls | Medium |
| Handguard | Good volume but side vents too small to register | Preserve 3-station octagonal shell, strengthen front taper within existing blunt-nose guard; enlarge four dark ventilation marks substantially without creating mesh layers | High |
| Magazine | Three tiny dark ribs look busy and metal-like; G36 translucency is not communicated | Retain shared STANAG-derived external contour **only**, keep G36's independent magazine part/feed/material, replace three stripes by one quiet broad opaque shading panel | Medium |
| Barrel/muzzle | P3 already improved square section; no benefit from fine machining | Keep stout simple 12+12 triangle prism pair and full original muzzle art endpoint | Medium |
| Selector/seams | Numerous microscale black dots/lines, no gameplay-sized benefit | Eliminate lower circle and seam, shallow receiver seam and opposite-side decorative line; one larger right-side port remains | Lowest |

## Acceptance and constraints

- True negative space from side, opposite and rear three-quarter; no double-sided-material workaround for carry handle.
- Game-scale checks at 64/128/256 equivalent, compared directly against real G36, AKM, FNC, FAL, HK33/G3 and M16A2 production factories.
- G36 remains a single integrated factory without an aftermarket rail, optic, cartridge feed migration, or new gameplay parts.
- Geometry ceiling <=430 actual triangles / <=16 meshes, **not** a target to minimize. Prioritize meaningful shapes.
- One cached pixel atlas with zero extra graphic meshes; validate right-only ejection mark and no lower selector or three narrow magazine ribs.
- Run G36 historical regressions, P3/P4 art tests, factory-wide polygon census, TypeScript/build, and browser visual capture before merge. Final visual acceptance is reserved for the user's on-device view.
