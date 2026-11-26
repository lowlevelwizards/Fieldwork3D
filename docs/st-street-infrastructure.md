# ST — Streets & Public Infrastructure

User-authorized staged overhaul. Approved VEH12 model dimensions remain unchanged. Existing historic sites must not be reinterpreted; versioned optional site layout; no changes to authoritative building/encounter selection. Existing 20 units/m. All dimensions are stylized design targets, not regulatory claims.

## Release batches

- ST-A (ST1–ST6 plus early lab): standards, street sections, roads, markings, legal parking, connected pedestrian circulation. First opt-in pilot, then enable only after mission/route parity and occupancy audit. Never invent a complete lane where only a cropped section fits.
- ST-B (ST7–ST10): contextual signs, lamps/power, fixtures, street composition. Static shared geometry; no moving traffic; preserve access and visibility. Regional policy defaults to a generic muted North American inspired convention, not real regulatory compliance.
- ST-C (ST11–ST12): expand Street Lab, audit visual and performance budgets, release default layout, verify Pages build. Group compatible checkpoints; do not pile production runs.

## ST1
Canonical dimensional standards and archetype section policy. No changes to live generator or renderer. Targeted tests with ST2. Initial plan uses bounded visible carriageway and explicit cropped semantic metadata rather than squeezing a full lane. Parking capacity derives from actual available dimensions. No global scale changes.

## Acceptance
Every orientation, three scales and varied archetypes; no new blocked routes, no changed mission semantics, no new overlaps with protected points; old snapshots unchanged. Surface/marking render plans share authority, bounded draw calls, no per-frame generation. Critical unit + browser checks, exact-base comparison and production verification.

## ST2 — pure versioned frontage proposal
New five-kind section planner handles all orientations, preserves nominal lane widths and explicitly records partial lanes, reserves a private approach, conditionally fits whole sidewalks/verges/shoulders and derives centerline location from the nominal section. Serialized optional frontage is authoritative to existing public-street consumers; absent field retains exact historical planner. Shadow conflict reporting identifies existing props requiring later relocation. No default generation changes or new collision. Junctions/side streets require subsequent topology pass; not claimed complete. Synthetic matrix covers 100 sections across types, orientations and setbacks.

## ST3 — surface finish vocabulary
Added deterministic bounded resurfacing patches, eight-sided manholes, curb drains, sidewalk joints, grass verge and gravel shoulder surfaces. New mark kinds participate in the existing static material/spatial packet batching; no per-frame work and no physical obstacle. Marks are confined to their authoritative public substrate and versioned sites only. Synthetic orientation/material containment tests. Road surface still uses the approved asphalt base; alternate heavy-duty surface policies and further weathering remain future work.

## ST4 — straight-section marking rules
Batched muted dashed centerlines, continuous industrial centerline and selected rural/industrial edge stripes. Center paint is tied to actual nominal lane boundary; a cropped near lane never gets a false centerline. No invented stops, crossings or arrows on straight segments. Junction-specific markings are deferred until connected topology exists. Synthetic containment/orientation checks.

## Early ST11 — Street Lab and first validation batch
Actual tactical renderer, generated site with existing vehicles and operators, seed/scale/type selectors, iso/overhead and legacy/proposal comparison. Reports cropped lanes, fixture conflicts and actual render counts. Shadow proposals may overlap old props, explicitly shown as diagnostics; they are not playable migrations. Dedicated focused tests plus 44-site corpus and browser screenshots at desktop/mobile. Corrected octagonal manhole UV path to avoid rectangular UV remapping. No default enablement yet.

## ST5 — fixed-pitch parking proposal
Versioned private lot single-row perpendicular/parallel/loading plans with fixed 56/120/66-unit pitch respectively, real 90/116-unit circulation aisle, separate vehicle access, no stretching to fill a lot, geometry-driven capacity capped at 14 bays and 8 vehicles. Whole-lot reservations include access lanes. Old parking behavior stays unchanged without ST metadata. Parking is still a shadow proposal until the integration/route audit. Angled/double-row and curbside parking remain planned extensions, not implemented yet.

## ST6 — connected public/private access and opt-in migration
Actual sidewalk-to-door path crosses any verge; vehicular cut is based on the dedicated lot access rather than the front door, with a separate paved link. Private frontage clipped to the new street boundary. Reuse the existing post-encounter retrofit and mobility acceptance logic, reject public conflicts or lost vehicle density, preserve historic layout on failure. Default remains legacy; Street Lab exposes shadow and validated pilot separately. 44-site corpus compares full authoritative mission selection and actual occupancy. New pilot still single frontage; complete junction, curbside/angled/double-row layouts, accessibility transfer and broader ST6 furniture integration remain pending. No claims of rollout or test results yet.

## ST-A validation corrections
Foundation checkpoint d1f1357 passed 12 focused tests, TS, browser captures, and 44-site shadow audit (44 proposals, 22 full sections, all 44 with full sidewalks and at least one complete lane, 40 existing-prop conflicts). ST5/6 test logs revealed a standard inconsistency: parallel and perpendicular stall lengths both 120. Set parallel length 130 (6.5m), retaining 120 perpendicular and widening synthetic test lot accordingly. Complete adjacent reserved transfer slot now has an authoritative center/width, paint coverage and exclusion; historical transfer behavior untouched. Add actual opt-in pilot browser mode. Material-art production 7bc12b3 was verified (85/85, Pages 7bc12b336e88-mwwyppbs) and merged into feature branch without overlapping edits. Fresh validation pending.

## ST7–10 first physical fixture checkpoint
Contextual private-side lamp, hydrant, bollard, wayfinding and bench placement using existing asset geometry. Bounded deterministic spacing, actual public/door/parking reserves, actor clearance, complete physical route revalidation and fallback to the unfurnished accepted ST layout. No moving traffic or extra per-frame lights. Correct stale legacy source assertion for the new shared street plan. Pending exact-head CI. Further work: richer sign art, junction and parking topology, power/light presentation, broader generation audit and default enablement.

## ST5 extension — double-row parking
For sufficiently deep non-industrial lots, two full perpendicular rows share one full-width circulation aisle and a separate connection. Each row retains fixed pitch and each physical stall/paint/clearance consumer uses the same row coordinates. Accessible transfer reservation stays on the primary pedestrian-side row. Deep lot proposal has a bounded fallback to single-row and legacy plans. Pending exact-head tests.

## ST12 candidate default integration (not released)
Ordinary new-site generation now selects ST without an opt-in; a failed physical retrofit retains the safe historical layout. Explicit historical witnesses and no-vehicle fixtures can still request legacy. Street Lab defaults to the real generation path, retaining legacy and shadow comparison, and reports marked capacity and street furniture counts. Expanded the default-vs-legacy audit to all three scales (66 sites). Exact-head validation pending; default is not live until the full release gate clears.

## Connected side-road checkpoint
Versioned secondary-road geometry joins a complete main street only where the entire unused map-edge corridor fits a nominal two-lane road and contains no existing rooms, zones, obstacles, protected points, or door reserves. Trim actual curb/sidewalk pieces at the opening; render the branch and bounded approach paint with existing static surface packets. No invented signalized junctions or traffic, no movement changes. Exact substrate assertions extended rather than removing earlier checks. Pending critical validation.

## ST7 traffic control and new asset
A separate chunky octagonal stop sign is registered in canonical scale and the Asset Lab. A side-road stopping bar appears only with a physically fitted right-hand approach sign; the sign and marking are accepted as one versioned layout after route/cover validation. If the map edge cannot fit a legal sign, omit the control instead of painting an unsupported stop. No simulated traffic or enforcement.
