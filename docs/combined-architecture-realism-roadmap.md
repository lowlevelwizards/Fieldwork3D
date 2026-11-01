# Fieldwork Breach — unified architecture + building realism roadmap

This combines **Expand Architectural Variety** and **Building Realism Audit** into
one progression. Physical plans, doors, props, wear, exterior sites and tactical
navigation must agree; visual decoration is never a substitute for a real room,
aperture, accessible fixture or navigable path.

## Already implemented foundations (retain and extend)

- Architectural vocabulary: interior/full-height glazing, serving cutouts,
  hinged/double/sliding doors, metal and chain-link gates, dividers, columns,
  glazed clerestories, privacy/iron fencing and security perimeters.
- Functional interiors: service counters, checkout/reception, queue lanes,
  back-of-house worklines and service access; foyers, mudrooms and vestibules;
  covered entries and building-specific furnishing.
- Procedural realism: distinct small/medium/large building programs, subtype
  floorplans, room contracts, capacity-aware bays, apartment/motel ownership,
  fixture recovery, bounded replanning, varied footprints and diagnostics.
- Existing property dressing, context-sensitive objects, texture wear and
  tactile fixtures remain part of the generation contract.

## Next rolling builds

| Build | Architecture + realism deliverable | Release gate |
| --- | --- | --- |
| **24A** | Door-capable essential room relationships; preserve continuity of open working zones | Seeded room-role/adjacency regression and typecheck |
| **24B** | Protect public-to-private circulation; prevent bathroom/exam/guest-room shortcuts while keeping every room accessible | Connectivity and route/privacy tests |
| **24C** | Strengthen layout search for restaurant, clinic, garage, office, retail, warehouse workflows; expose failed relationships in Map Lab | Sampled archetype/size tests |
| **25A** | Structural completeness: actually fit required toilets, sinks, stoves, beds, lifts, etc. with usable approach clearances | Fixture contracts and blocked-path tests |
| **25B** | Unit completeness for apartment and motel: private entry, bath, bed, living/service spaces as appropriate | Unit-boundary and room-contract checks |
| **26A–C** | Operational pathways: customer/staff separation, delivery, kitchen service, checkout queues, repair bays, utility maintenance and exit routes | Navigable work routes and no-overlap checks |
| **27A–C** | Room-history logic, believable furniture clusters, orientation, clutter, damage and material-specific wear | Seeded placement and render smoke tests |
| **28A–C** | Property logic: sidewalks, setbacks, parking, loading, garages, courtyards, balconies, fences, outbuildings, exterior service zones and entry approaches | Site-edge, access and perimeter checks |
| **29A–B** | Multi-seed quality scoring, missing-function reports, generation budget and mobile Map Lab diagnostics | Stress samples and production build |

## Architectural variety carried forward

Keep the architecture track rolling alongside realism, using shared generation
contracts rather than parallel one-off decorations:

- **15–16: functional variety** — compact commercial identities, booth and
  restaurant seating clusters, bar/counter ordering, kitchen serving windows,
  waiting arrangements, checkout operations, and purposeful access.
- **17–18: building transitions + plots** — porch/vestibule/threshold
  combinations, service doors, yards, balconies, gardens, loading docks,
  exterior stairways, gates, mudrooms, garages, exterior structures and
  property-scale layouts.
- **19–20: composition + material meaning** — coherent glazing/door families,
  mixed-use building wings, different floorplates, age/condition and facade
  conventions by archetype; always physical, visible and collision-aware.
- **21–24: generator + Map Lab** — contextual selection, inspectable
  fixtures, clearances, warnings, seed reproducibility and architectural
  quality audits.

## Merge/release protocol

One bounded build per branch, grounded on current main. For each build:
1. Keep the affected geometry and gameplay contract together.
2. Run critical seeded tests, TypeScript checks and the production build.
3. Merge only when the targeted checks pass; never claim Pages is live from a
   successful GitHub merge alone.
4. Recheck main before the next build; integrate already-landed architecture
   work instead of repeating it. Escalate if a new solver threatens widespread
   regeneration, performance, or navigability.

**Important distinction:** 24A makes relationships *door-capable* at the
blueprint level; it does not prove that the final door graph uses every such
edge. The compiler and route audits remain authoritative. Build 24B addresses
that next.
