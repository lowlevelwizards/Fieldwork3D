# D2 — Facewear, Masks, Glasses & Goggles: Comprehensive Catalog
**Date:** 2026-11-04
**Branch:** feature/operator-visual-details-2026-11-04
**Status:** design and reference audit only; model implementation pending.

## Goal & art contract
Upgrade existing `facewear` and `eyewear` categories without building a duplicate wardrobe system. Count a silhouette as a **distinct model** only when its form reads differently at normal gameplay zoom. Colors, approved camouflage patterns, lens tints and wearable positions are orthogonal variants. A broad 50–60-candidate reference catalog can collapse into ~25–30 first-wave game models.

- Compact, chunky symbolic geometry, a coherent minimum voxel step and one dominant readable silhouette.
- Existing skeleton, canonical head orientation, gaze, weapon grip, gameplay protections, damage and carrying ledger do not change.
- No accessory creates actual CBRN protection, tactical buffs, light filtering or impaired vision unless separately introduced as an explicit mechanical system.
- References are **visual forms**, not an instruction that all real PPE is mutually compatible.
- Recolor masks via proper cloth/rubber/metal/plastic channels; lens color/reflectivity must not be confused with physical fabric paint. Use existing headgear camouflage only for plausible fabric/cover pieces.

## A. Balaclavas / full fabric head coverings (8 candidates)
| ID | Proposed Studio name | Distinct cue | Wave |
|---|---|---|---|
| balaclava-one | Single-eye opening | one wide eye window, covered nose and mouth | 1 |
| balaclava-three | Three-hole | distinct eyes and mouth hole | 1 |
| balaclava-two | Two-eye opening | separate eye holes, closed mouth | 1 |
| balaclava-open | Open-face balaclava | large visible central face, covered head/neck | 1 |
| balaclava-slim | Fitted tactical balaclava | thin textile, tighter hood/neck, horizontal eye opening | 1 |
| balaclava-winter | Insulated balaclava | heavy collar, tall knit thickness | 2 |
| balaclava-vent | Vented-face balaclava | large coherent dark vent over mouth (not perforated pixel specks) | 2 |
| hood-wrap | Loose hood and face wrap | loose hood falling to shoulders, narrowed face window | 2 |

## B. Gaiters, scarves, wraps and lightweight half-face coverings (14 candidates)
| ID | Name | Distinct cue | Wave |
|---|---|---|---|
| gaiter-low | Lowered tube gaiter | folded neck loop, face clear | 1 |
| gaiter-raised | Raised tube gaiter | nose/mouth covered | 1 |
| gaiter-short | Short fitted half-gaiter | short streamlined fabric band | 1 |
| gaiter-fleece | Insulated fleece gaiter | padded collar | 2 |
| shemagh-loose | Draped shemagh | triangular chest folds and scarf ends | 1 |
| shemagh-wrapped | Wrapped shemagh | nose and mouth wrap, side tie | 1 |
| scarf-field | Field scarf | narrow wrapped neck band | 1 |
| scarf-winter | Heavy winter scarf | thick knitted, visible trailing end | 2 |
| bandana | Triangle bandana | tied cloth triangle over lower face | 1 |
| fabric-half | Fitted fabric half-mask | nose bridge and elastic loops | 2 |
| neoprene-half | Neoprene-style face panel | structured curved panel and trim | 2 |
| mesh-half | Ventilated lower-face shield | shallow vented rigid/mesh panel | 2 |
| medical-mask | Pleated medical mask | rectangular pleats and ear loops | 2 |
| cup-dust | Disposable cup dust mask | projecting cup and head bands | 2 |

**Variants, not new models:** lowered/raised when topology permits, black/olive/coyote/gray/white, approved print sets on fabric, subdued cloth wear. Avoid automatically assigning real-world camouflage to mask elastomer or glass.

## C. Reusable half-face respirators (5 candidates)
| ID | Name | Reference / dominant cue | Wave |
|---|---|---|---|
| respirator-low | Low-profile half respirator | triangular nose-mouth seal, shallow center valve | 1 |
| respirator-dual | Industrial dual-cartridge respirator | 3M 6000/7500 family, paired side cartridges | 2 |
| respirator-tactical | Compact tactical respirator | close-fitting facepiece, side filter port | 2 |
| respirator-filter-pads | Flat twin-pad respirator | small wide, shallow disc filters vs tall cartridges | 2 |
| respirator-hood | Half respirator + fabric neck shroud | hood or scarf covering strap/back-neck junction | 3 |

Optional filters: L/R single port, twin filter, cartridge diameter/depth, straps (only actual plausible configurations). All remain cosmetic.

## D. Full-face masks / gas masks (12 candidates)
Distinct masks should not be the same rubber cube with an attached cylinder.
| ID | Visual family | Reference / dominant cue | Wave |
|---|---|---|---|
| gas-gp5 | Soviet hood mask | GP-5: entire rubber head hood, small round glass, big central filter | 2 |
| gas-gp7 | Soviet strapped mask | GP-7 family: separate head harness, angular cheeks, side/front canister | 3 |
| gas-m17 | Integrated cheek filters | M17: two cheek filters integrated into facepiece, small round lenses | 2 |
| gas-m40 | Single-cheek canister | M40: twin rigid lenses and dominant external cheek filter | 2 |
| gas-s10 | British round-eye | S10: projecting twin eyepieces and side-mounted canister | 2 |
| gas-fm12 | Compact twin round-eye | FM12: reduced face profile, twin circular eyepieces, side filter | 2 |
| gas-m50 | Modern conformal twin filter | M50/FM50 family: panoramic visor, broad mouth valve, two low cheek filters | 2 |
| gas-c50 | Modern single filter | C50: panoramic visor with single side filter/ports | 2 |
| gas-fm53 | Tactical modular mask | FM53: panoramic lens, modular left/right filter arrangement | 3 |
| gas-industrial | Industrial full-face respirator | 3M full-face archetype, continuous clear visor, paired cartridges | 3 |
| gas-hose | Vintage hose mask | round glass eyes, long corrugated frontal hose routed to bag | 3 |
| gas-hood | Protective escape/CBRN hood | soft hood enclosing mask and neck, wide clear window | 3 |

Keep branded/model names in reference notes; Studio can use clear family names rather than implying an exact certified model. Do not permit impossible combinations, e.g. FM50 single huge front canister, or M17 external giant canisters.

**Visual details:** correct visor frame and opacity, lens count, brow profile, central speech/exhalation module, canister placement, harness/hood topology, filter caps, clear negative space between face and cartridge, and rear/side silhouette. Add breathing hose only to reference-appropriate setups.

## E. Spectacles, safety glasses, sunglasses (12 candidate frames)
| ID | Proposed name | Readable distinction | Wave |
|---|---|---|---|
| glasses-rx-rect | Rectangular prescription frames | thin divided lenses and temples | 1 |
| glasses-rx-round | Round prescription frames | two round lenses | 2 |
| glasses-rx-bold | Heavy-frame glasses | larger thick frame and temple silhouette | 2 |
| glasses-aviator | Aviators | twin teardrop / rounded lenses, nose bar | 2 |
| glasses-classic-sun | Classic sunglasses | broad trapezoid frames | 2 |
| glasses-wrap-sun | Wrapped sport sunglasses | arched temple-to-temple lens shape | 1 |
| glasses-tactical-shield | Single-shield tactical glasses | ESS Crossbow / Revision Sawfly style continuous lens | 1 |
| glasses-tactical-dual | Split-lens tactical glasses | separate lens segments, bridge and temples | 1 |
| glasses-low-profile | Slim protective glasses | thin low-profile wrap, headset compatible | 1 |
| glasses-safety | Basic safety glasses | larger clear frame, strong side protection | 1 |
| glasses-side-shield | Mountaineering side shields | small side shielding and round/oval lens | 3 |
| glasses-retro | Vintage shooting/field glasses | thick square/rectangular look | 3 |

No need to model `clear tactical` and `smoke tactical` separately: same frame with lens material variant. Suggested tints: clear, smoke, dark smoke, amber, yellow, bronze, light green, vermilion/orange, mirrored; clear and smoke should be early.

## F. Goggle systems (7 candidate frames)
| ID | Name | Distinct cue | Wave |
|---|---|---|---|
| goggle-low | Low-profile ballistic goggles | ESS Profile NVG-type slim sealed brow | 1 |
| goggle-wide | Large sealed field goggles | Revision Desert Locust / ESS Influx-type broad face gasket | 1 |
| goggle-vented | Vented sand/dust goggles | deep side vents, thick frame | 1 |
| goggle-retro | Two-eye field goggles | separate circular/oval cups, narrow bridge | 2 |
| goggle-modern | Very low-profile lens goggles | streamlined single visor panel | 2 |
| goggle-cold | Winter/snow goggles | thick insulation, wide lens, raised nose bridge | 2 |
| goggle-industrial | Workshop/safety goggles | heavy clear eye enclosure | 3 |

**Goggle state is independent of frame type:** over eyes, raised to helmet brim/top where physically plausible, and stowed at neck where plausible. A raised pair remains the same model, not a second SKU. Strap bends/clearance depend on ACH vs PASGT vs high-cut vs cap; no universal floating forehead strap.

## Preset priority
**First playable 25-ish silhouettes:** one-hole, three-hole, two-hole, open-face, slim tactical; low/raised/short gaiter, loose/wrapped shemagh, field scarf, bandana; one compact half respirator; 4 tactical/safety/prescription glasses, sport sunglasses; low-profile, wide sealed, vented goggles; M40, FM12, modern M50, Soviet GP-5 (subject to art review). The exact set can be trimmed for visual differentiation.

**Expansion:** heavy winter/fleece, mesh variants, disposable health/safety masks, additional respirators, historical and modern full-face masks, unusual optics and mountain frames.

## Customization and compatibility schema
- Preserve existing `styles.facewear` and `styles.eyewear` identifiers as the top-level selection API. Old values migrate to the closest redesigned family.
- New optional fields: `facewearFabric`, `facewearCamo`, `facewearMode`, `eyewearFrameColor`, `eyewearLensTint`, `eyewearPlacement`. Use validated IDs, omit absent data and preserve version-1 appearance reader support (or explicitly version with migration).
- Existing headwear and headsets stay independent. Full-face gas masks occupy the eyes and mouth, therefore hide separate eye glasses/goggles and incompatible boom mics while offering integrated lens outserts, internal mask communications or mask-compatible audio as visual variants only.
- Cloth balaclavas and raised gaiters pair with compatible eye protection; shemagh and safety glasses should not collide with nose bridge.
- Goggles stowed on head or helmet require exact helmet/hat geometry; unsupported combinations visibly fall back to a compatible placement with a UI note, not intersect.
- Hood-style masks affect the hair visibility/mask boundary and helmet strap routing. Hair visibility is based on actual covered region.
- Visor lens materials must render transparent/smoke without z-fighting or expensive overdraw. Clear eye openings reveal existing skin/face; no solid flesh-colored lens patches.
- Ensure every cosmetic accessory has a backside, side silhouette, and meaningful head attachment. Shared mirrored eye landmarks / eyebrow bridge / upper nose / cheek / chin / ear/temple / helmet brim contact surfaces.

## Implementation stages
D2-00 **reference and fit contract**: front/3/4/side/back reference sheet; canonical -Z face landmarks and shell surface anchors; compatibility matrix. Critically audit existing facewear model coordinate mismatch with canonical helmet silhouettes.
D2-01 **balaclava silhouettes**: five first-wave fabric models; real apertures, textile collar, side-to-back connectivity, hair clipping.
D2-02 **gaiters, wraps, scarves**: lowered/raised, six principal silhouettes, neck and chest occlusion around combat shirts, BDU, ACU, smock, Gorka and armor collars.
D2-03 **spectacles and sunglasses**: six principal frame families, realistic lens/bridge/temple geometry, clear and smoke materials; optical surface test.
D2-04 **goggles and wearing positions**: three principal frame types, on-eye/raised/stowed states, strap fitting to each approved helmet family.
D2-05 **half-face respirators**: compact primary form; dual cartridge industrial extension, head strap clearing comms equipment.
D2-06 **historical gas mask archetypes**: GP-5, M17, M40, round-eye FM12/S10 distinction with meaningful visor, hose and filter geometry. Gate each against headwear before expansion.
D2-07 **modern masks**: M50 twin conformal filters and C50-style side filter, optional FM53 extension; anti-coplanar transparent visors.
D2-08 **integration/polish**: camera matrix captures, mobile gameplay zoom, save/undo/Quick Play/Campaign, material performance, conflict messaging. No mechanical protection promised.

## Release checkpoints
- **Batch D2-A:** D2-00 to D2-02: cloth masks and wraps.
- **Batch D2-B:** D2-03 to D2-05: glasses, goggles and half respirators.
- **Batch D2-C:** D2-06 to D2-08: full-face masks, compatibility and polish.
Commit each completed stage to a feature branch, merge only compatible checkpoints after successful critical tests; do not stack production deployments. Before any new Pages merge, confirm last production run succeeded and live build stamp matches the expected commit.

## Minimal critical gates
- TypeScript build and targeted catalog/type/persistence/geometry tests.
- Capture face vs headwear front, side, 3/4, rear, gameplay zoom: 7 approved headwear shapes × representative facewear/eyewear/headset combinations.
- No changing eye sockets/head position, muzzle/aim behavior, helmet protection or vision cone.
- Verify no clipping through normal idle, crouch, aim, reload, head turning and injury/downed poses.
- No repeated high-frequency posing allocations, no exploding draw calls, and no incorrect semi-transparent lenses.
- Old saved `facewear`/`eyewear` options must remain readable.

## Reference leads (visual, not endorsements)
- US Army [APEL eyewear]: https://cpeground.army.mil/Equipment/Approved-Eyewear-QPL/Revision-Desert-Locust/
- Revision product ranges: https://revisionmilitary.com/goggles/desert-locust
- US Army equipment list (eyewear and goggles): https://www.usarcent.army.mil/Portals/1/USARCENT%20Standards%20Book%20%2001%20FEB%2023.pdf
- Avon FM12: https://www.avon-protection.com/products/fm12/
- Avon FM50: https://www.avon-protection.com/products/fm50/
- Avon C50: https://www.avon-protection.com/products/c50
- Avon FM53: https://www.avon-protection.com/products/fm53/
- US M40 historic source: https://asc.army.mil/docs/wsh2/1997-wsh.pdf
- M17 historical: https://www.bulletpicker.com/pdf/TM-3-215.pdf
- Industrial half masks: https://www.3m.com/3M/en_US/p/d/b00039327/

Artist-provided reference photos should take priority for exact silhouette and era details during production.
