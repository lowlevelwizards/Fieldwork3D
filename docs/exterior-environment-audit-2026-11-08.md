# Fieldwork Breach — Exterior environment audit
**2026-11-08 · First-pass code audit and staged remediation**

## Desired identity
Outdoor spaces must read as functioning premises and streets, not procedurally
dropped tactical props. Preserve the readable, chunky miniatures of Fieldwork,
but make *why something is in a place* obvious. The exterior should be
believable at 2D floor-plan zoom, gameplay isometric zoom and Director camera.

This audit is based on the current generator, catalog and Three.js source.
It is **not** a claim that every asset has passed a fresh device visual review.
A seed/shot acceptance matrix remains required.

## Root causes (verified from code)
1. `exterior-sites.ts` gave most zones only two primary objects, or three in
   gardens; it anchored parking and driveway zones to particular **vehicle**
   models. This overrepresents bad vehicles and underpopulates foliage.
2. `breach-windows.ts` had a **second, independent frontage prop pass**
   that created a generic `vehicle` for most building archetypes and a
   `bench` for clinics, bypassing any real street, parking or amenity rules.
   This is removed in Stage A; only the exterior system now authors outdoor
   furnishing.
4. `landscape-edge-program.ts` generated at most three small candidates
   under restrictive zone sizes. Tree colliders were as wide as their crowns;
   candidates were often rejected near walls, doors and paths.
4. The old vegetation renderer in `fixture-visuals.ts` made broadleaf blobs,
   stacked conifer cones and uniform shrub lobes. This reads as rocks and
   angular balls, not pixel-card foliage.
5. The only strong placement contracts were world bounds, overlap, door
   distance, protected encounter points and the arrival lane. Postal, public
   service, street, parking and amenity relationships were under-specified.
6. `property-surfaces.ts` builds flat sidewalk/curb/crosswalk/parking and
   maintenance rectangles. Surface elevations were recently separated to
   stop z-fighting, but curb ramps are still visual marks, not a modeled
   sloping transition. Never claim these are certified accessible routes.
7. The "vending machine" reported in replay is a dark **utility cabinet**.
   There is no actual vending-machine fixture in the prop catalog. Its
   surprise appearance was fixed in the earlier Director replay batch, but
   poor contextual generation remained.
8. `asset-review.ts` itself flags several cars, tree families and bike rack
   silhouettes. Existing reviews are not approvals of visual quality.

## Current release batch / Stage A
- Retire sedan, SUV, pickup, van and generic vehicle placeholders from
  **new generated mission exteriors**. Keep source/catalog models for
  eventual rebuilding; retain existing replay compatibility.
- Replace the blob/cone vegetation branches with deterministic 64px
  nearest-neighbor, alpha-tested 2D foliage cards. Cross vertical planes
  plus a small horizontal canopy card, with simplified trunk and branching
  silhouettes. No per-frame billboarding and no new shadow-casting card mesh.
- Use small, real trunk collision for generated trees; preserve broad visual
  crowns. Keep authoritative obstacle cover rules and intel reveal.
- More seeded landscape-edge clusters; plants belong to genuine gardens,
  yards or raised planters, not arbitrary asphalt.
- Limit mailboxes to house/townhouse public frontage, signposts to suitable
  parking frontage, bike racks to public uses, freestanding utility cabinets
  to service yards, and parking wheel stops to the marked-bay pass.
- Place frontage infrastructure at side edges, not in the center of
  pedestrian routes. Continue to validate physical collision, arrival lanes,
  room intersection and door approaches.
- Add focused procedural/visual regression tests. Do not expand the
  production release while deployment is queued.

## Remaining audit by asset class
| System | Current implementation / concern | Required next-pass outcome |
|---|---|---|
| Cars, pickups, SUVs, vans | Multi-box/extruded visual family; prior parking anchor guaranteed cars | **Retired from new gameplay.** Completely reauthor from reference dimensions: believable stance, glass, wheels, cab, underbody. No resize-to-fit cheats. Only return after art approval and actual bay-based parking. |
| Broadleaf, conifer, scrub trees | Blob/layered-cone silhouettes; huge physical footprint | Stage A pixel cards, readable species-specific crowns and branching. Next: art review for canopy density, overlap, color variety, top-down readability and shadow. |
| Shrubs and hedges | Identical abstract lobes, too sparse | Layered pixel cards with intentional silhouette variance; explicit bed/edge/hedge rows and no isolated shrubs on asphalt. |
| Ground cover | Little low vegetation apart from large physical bushes | Add later **visual-only** verge grass and small ornamental planting to approved softscape regions. No invisible collision or concealment. |
| Mailboxes | A simple post/case, formerly random front/rear yard selection | House/townhouse **street-facing property frontage**, correct height, orientation, number per dwelling. Apartment/motel should have shared mail infrastructure instead. |
| Utility cabinets | Box with dark door and three warning/vent stripes, mistaken for vending | Rear/side building utility service zone only, face reachable service clearance; distinguish meter cabinet, power transformer and service pedestal. Door/hinges must face out into accessible work space. |
| Wall electrical boxes | Separate wall details in wall dresser; not same as outdoor utility cabinet | Attach to appropriate exterior service façades and utility rooms, aligned to walls, at plausible height; never floating in open streets or across doors. |
| Vending machines | No real catalog prop | Do not fake with utility cabinet. Future dedicated machine with unmistakable display/buttons/product area, placed at public entry, sheltered lobby, rest area or service court with clearance and power access. |
| Benches | Generic bench/chair shape rather than dedicated outdoor public-seat system | Separate park bench, entrance bench and waiting bench. Orient toward walkway/garden/amenity; leave foot and transfer space clear. No random seats in driving lanes. |
| Patio tables/chairs | Broad patio zone randomness | Cluster real seating groups at restaurant/café patios or yards; ensure doors, chairs and paths remain reachable when occupied. |
| Parking barriers/wheel stops | Distinct low physical block pass tied to painted bay candidates | Only at **end of actual bays**, consistent orientation and spacing. Bollards protect doors/walls and pedestrian boundaries, not random obstacles across drives. |
| Parking signage | Simple post/plate; can be arbitrary in an arrival parking zone | Anchor at bay edge with meaningful reserved/loading/access sign and consistent face orientation. No sign in a vehicle maneuvering aisle. |
| Sidewalks/curbs/ramps | Flat rectangles; depth separation fixed earlier | Author street/sidewalk/curb polygons from a shared exterior street frontage; mark clear walking continuity, consistent curb heights, only real curb breaks. Model ramps where necessary. |
| Roads, markings, parking stalls | Road is a straight visual strip derived from entrance and map edge, not a full road network; stalls are generic | Define carriageway, service lane, sidewalk and private drive as distinct semantic surfaces, so no sign/cabinet appears in the street. Avoid faux crosswalks that lead nowhere. |
| Street lamps | Large pole with basic head; weak connection to street and building | Located on public/parking edge with correct clearance from doors, utility boxes and signage; dedicated pool or stylized shadow only if justified by lighting budget. |
| Hydrants | Very simple block assembly, formerly random yard | Municipal street verge, unobstructed access envelope and recognizable cap/nozzles; not a private back garden feature. |
| Trash/recycling/dumpsters | General pads/zone labels, some edge grouping | Cluster bins near rear service or residential collection access. Dumpsters need truck approach and appropriate enclosure/pad; never public pedestrian line. |
| Bike racks | Prior hoop orientation issue flagged in art review | Redraw unmistakable connected hoops; position on hardstanding near public entry with access/locking space, not across door swing. |
| Planters | Basic pot/leaf arrangement, outdoor placement can be arbitrary | Real planter dimensions, visible soil and planting card clusters; use as separation along patios/entrance landscaping, not road barriers by accident. |
| Fences, gates and property buffers | Mixed fence families; not the same as planted boundary | Generate deliberate edges/gates, do not overlap door leaves or block the only route. Match residential/industrial security identity. |

## Placement system revision (Stage B; not yet all implemented)
1. Build a semantic exterior ground registry per site with distinct, ideally
   polygonal surfaces: **public carriageway, curb verge, sidewalk, pedestrian
   connection, private drive, parking stalls, loading/service pad, planted
   bed, garden, building apron, utility access**.
2. Every fixture declares required and forbidden substrates, preferred
   adjacency, preferred facing, access/maintenance apron, minimum spacing and
   visibility role (physical cover vs decorative).
4. Generate major fixed/utility objects first; reserve pedestrian and vehicle
   circulation second; then add furnishings, planting clusters and final
   decals without moving existing critical paths.
5. Structural access trumps aesthetics: keep real door swing, operator
   shoulder-clearance, flash/fire visibility and extraction lanes intact.
6. Seeds vary composition/age and **purpose**, not object positions alone.
   A house front yard may have mailbox + hedge + tree; a warehouse gets loading
   lane + service utilities; a clinic gets pedestrian approach + parking.
7. Reserve layout space for future vehicle bays, but do not fill with old
   car models during this art-rebuild phase.

## Art / technical acceptance
- **Foliage cards:** discrete, chunky pixel scale; nearest filtering,
  binary alpha test, depth writing and double-sided material. Three fixed
  crossed/top cards per crown, no heavy leaf geometry or camera billboard.
  Share textures/materials by family, use fixed seed variations, cap counts.
- **Tactical truth:** physical cover and visibility remain controlled by
  worldgen geometry and sight logic, not by decorative alpha overhangs.
- **Replay truth:** repeated playback and reversed seeks preserve authored
  prop identity, transforms and disclosure; never spawn unexplained props.
- **Performance:** avoid dozens of translucent overdraw layers, per-frame
  geometry allocation and per-tree shadow-map casters. Compare GO/replay
  frames and draw calls on mid-range iPhone.
- **Seed matrix:** house, townhouse, apartment, motel, retail, restaurant,
  clinic, office, garage, warehouse, utility; all orientations and small,
  standard, expanded sizes. Spot-check 3D iso, plan view and Director close-up.
- **Functional review:** no fixed fixtures inside street or necessary
  pedestrian route; no mailbox behind a property; no rear dumpster blocking
  fire/egress; no tree crown through building; no unmarked fake vending box.

## Proposed stages after A
**B — Street / utility correctness:** street masks, curbs, driveway and
crosswalk continuity, electrical and utility service placement, bollards,
hyd­rants, trash enclosure, parking stalls and signs.

**C — Exterior identity art:** mailboxes, meter boxes, benches, bike racks,
street lamps, planters, bins and purposeful commercial amenities.

**D — Vehicle redesign lab:** one vehicle at a time with type-specific geometry
and objective size checks. Author parking logic before restoring any cars.

**E — Audit gallery / acceptance:** representative fixed-seed screenshot
matrix with at least one front, side and rear exterior per archetype.
