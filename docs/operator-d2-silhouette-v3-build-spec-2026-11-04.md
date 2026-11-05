# D2 Facewear V3 — silhouette-first art implementation plan

Date: 2026-11-04. Visual direction: deliberately oversized, chunky, stubby, low-poly, symbolic. Every inclusion must justify itself from front, three-quarter, side and rear.

## Existing audit and references
| Item | Reference archetype | Working | Failure mode | V3 design decision |
| --- | --- | --- | --- | --- |
| Uncovered | Bare minimalist cube head | Strong proportion datum, eyes legible | Very flat | Keep baseline unchanged |
| One-opening balaclava | Close-fitting knitted ski hood, one eye opening | Continuous exterior hood | Straight rectangular visor | Refine stepped single opening; shared folded neck hem |
| Three-hole balaclava | Classic three-aperture knit hood | Unique three openings | Equal square holes | Two narrow eyes, smaller lower mouth, deliberate bridges |
| Open-face balaclava | Full-face-exposure helmet liner/hood | Good open-face read | Straight face opening | Cheek and jaw framing, no visor confusion |
| Neck gaiter | Elastic cylindrical tube | Lowered form is clean | Raised modes have rigid horizontal bands | One smooth tube, understated upper cuff, neck gathered below |
| Bandana | Folded square tied as face or neck kerchief | Has a tapered front | Often looks like a gaiter | Thin pronounced triangular bib and real rear knot / unequal tails |
| Shemagh | Large layered field scarf, optionally head-wrapped | Chest drape has potential | Face mode like tube; head mode like balaclava | Largest soft-cloth mass, off-axis tail, diagonal wrap; layered crown folds, no full hood |
| Tactical half-mask | Molded lower-face plate with straps | Rigid contrast to fabric | Potential intersections | Keep and audit fit, no arbitrary remodel |
| Respirators and full gas masks | Distinct filter, hood and visor families | Separate silhouette anchors | Equipment overlap | Compatibility check after cloth |

## Identity and proportion requirements
- Gaiter: least bulky wrap, no knots, bibs or scarf tails. One continuous tubular wall, mouth and nose states differ in upper edge height.
- Bandana: stepped triangular front point, thin layer and visible tied rear wings/tails; shorter and lighter than shemagh.
- Shemagh: bulkiest fabric mass with wide shoulder drape, substantial layers and one asymmetric tail; face-wrap is angled, crown-wrap has distinctly wrapped crown ribbons, NOT a box hood.
- Balaclavas: one fitted shared sock family, unique openings supply identity. Connected hem/collar, not hard-helmet block.
- No needless new SKUs or duplicate wearing positions. All existing saved IDs and modes remain recognized.

## Stages and release checkpoints
A1: Commit silhouette audit, reference archetypes, bounds and acceptance criteria.
A2: Replace gaiter raised and lowered geometry; minimize horizontal stripes. Check actual shape, geometry reuse and height progression.
A3: Build joined triangular bandana with rear knot and two uneven tails, plus differentiated shemagh drape/face/head wraps. Side/rear silhouettes essential. This is visual release Batch A.
B1: Balaclava family opening and neck refinements; reuse common fitted shell; keep three-hole/two-hole wearing state.
B2: Audit saved mode fallback, helmets, eyewear, material scale, small-card vs Studio preview; critical geometry, save, mobile Studio checks. Batch B release only after A Pages public verification.

## Hard constraints
Keep canonical head axes (-Z forward, +X right, +Y up), 8-unit head, same gameplay collision/equipment stats, unchanged character skin and material palettes, no geometry allocation per wearing-mode change, and preserve Studio thumbnail performance optimization. Do not silently delete any mode without human visual signoff. Keep large expressive shapes over noisy small details.

## Release discipline
Commit stages to feature branches; critical tests only: node tests for geometry/saves, npm run build and mobile Studio smoke. Merge compatible groups only at release checkpoints. Before merging check for active Pages runs and verify that last deployment succeeded and public fieldwork-build.json matched expected commit. On Pages failure stop merges and investigate rather than pile releases.
