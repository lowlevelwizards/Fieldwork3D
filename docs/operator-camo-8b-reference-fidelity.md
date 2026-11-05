# Camouflage 8B — Reference fidelity, 8A follow-up

## Scope and invariants
Refine **only the eight 8A camouflage artworks** using the exact 64×64 indexed-tile pipeline already shared by headwear, fabric and equipment. All 54 camouflage IDs, selectors, garment policies, operator saves, UV reroll rules, and legacy 7B/7C patterns remain unchanged.

**Why:** The first 8A release was readable, but Izlom could be mistaken for SS-Leto; JGSDF and SANDF Soldier 2000 seemed too alike; the two stripe relatives were still too mechanically uniform. Fine-tune the remaining three without compromising their family geometry.

## Referenced print identities

| 8A print | Reference cues | Implementation/acceptance | Closest comparison |
|---|---|---|---|
| Russian Izlom / Skol | Dark flecktarn-like forest, but small jagged/angular lozenges, fragments of tan and rust. Authentic photo: https://strikehold.net/2017/11/14/more-russian-camouflage-modoxskol/ | Reduce light area, cool/darken green/charcoal, retain rust accents; bake numerous **short hooked lozenges**, no rounded oakleaf or Leto pea-dot fields. | Flecktarn and 7C SS-Leto |
| Greek Lizard (traditional, not the new M24) | Overlapping dark olive and brown horizontal brushstrokes with characteristic interrupted stippled ends, varying tan/olive fabric. https://camopedia.org/index.php/Greece | Split originally long brush polygons into offset partial segments; narrow and taper edges, sometimes stagger secondary strokes; warm khaki ground. | Tiger Stripe and Urban Kamysh |
| Urban Kamysh | Broad wavy dark blue/black tiger/reed bands, medium steel blue, misty gray negative space; not flat ruler stripes. https://camopedia.org/index.php/Russia | Preserve longer/wider bands, add jagged teeth at ends and distinct dark crescents; keep **blue** tonal family while Greek stays green/brown. | Tiger Stripe and Greek Lizard |
| JGSDF Type II / Jieitai Dot | Rounded clusters and tight small dots on leafy green, red-brown and pale warm beige; charcoal punctures. https://fareastmilsim.com/jsdf-equipment | Shrink 8A large motifs, add near-parent round satellite flecks, reduce brown ground and charcoal block size, slightly greener palette. | Flecktarn, Izlom, Soldier 2000 |
| SANDF Soldier 2000 | **Kalahari brown visible ground** under irregular sage/grass/dark-green blotches with interior speckling; unusual cool pale sage accents. https://camopedia.org/index.php/South_Africa | Scale green islands inward to expose more brown; **paired small spots inside** (not around) green forms. No Flecktarn-style micro clouds; cool pale green. | JGSDF Type II, SS-Leto |
| PenCott MetroPolis | PenCott macro/midi/micro three-scale fractal and false edges, urban industrial mineral/dirt. https://www.pencottcamo.com/about/ | Exact existing PenCott index topology; subtle cool slate/mid-gray/muted earth rebalance only; no new mask. | GreenZone, BadLands |
| Kryptek Typhon | Original Highlander-like broken reptilian mesh overlay, cooler dark achromatic near-black and graphite. https://kryptek.com/pages/kryptek-camo-patterns | Preserve byte-for-byte Highlander index mesh; neutral charcoal regrade, eliminate blue-violet cast. | Kryptek Highlander, MultiCam Black |
| Norwegian M98 | **Very large rounded contiguous** dark olive, yellow-green, tan fields; no dots or tiny angular camouflage. https://www.joint-forces.com/kit-camo/33505-norwegian-army-m98-pattern | Keep precisely 3 inks, slightly greener yellow olive, round isolated 1px corners using two-pass nearest-neighbor contour cleanup. | M81, Swedish M90 |

## Rolling branch stages

1. **8B-A: largest identity corrections**: Izlom angular notched/short-shard overprinting, JGSDF smaller rounded flecks with correlated dots, S2000 opened brown ground plus interior light/dark spots. Commit as a single compatible art stage.
2. **8B-B: the two stripe families**: green/brown Greek brushstrokes become broken and stippled; blue Kamysh bands retain width but gain jagged branching and heavier dark contrast. Commit.
3. **8B-C: family polish**: PenCott and Kryptek palette-only; M98 rounded overscale three-color cleanup. Commit.
4. **8B-QA**: 64px deterministic and opaque pixel checks, all 54 IDs and saved looks, distinct layout of confusable pairs, M98 exactly 3, S2000 brown visually dominant, byte-exact MetroPolis/GreenZone and Typhon/Highlander indexed master equality, unchanged 7C Leto, nearest-neighbor texture, focused compatibility tests. One PR, focused CI + production build. Commit.
5. **Release gate**: check previous deployment SHA and public Pages build stamp; no queued or running deploys, and no conflicting changes on `main`. If any gate fails, **do not merge**. If clear, single merge of whole 8B batch. Verify Pages public stamp for new commit after deploy. No overlapping production queue.

## Quality targets

- **Swatch (80px) and on operator:** single-glance recognition without labels, from top and trousers, and at gameplay zoom.
- **Shape identity:** Izlom fractured ≠ Leto lobes + pea dots; Jieitai clustered small flecks ≠ Soldier 2000 broad green island + spots; Greek short painterly stripes ≠ Kamysh broad blue tiger bands.
- **World scale:** unchanged from 8A per pattern, no extra image textures, no per-frame procedural work; indexed master is cached.
- **Color:** art-directed RGB relatives of real textile, not claimed official measured color codes; avoid oversaturation; keep motif-specific contrast even when printed beneath pocket seams.
- **Performance:** rasterize small Izlom marks within their local polygon bounding box at master bake rather than rescanning the entire tile for each mark.
