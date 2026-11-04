# RIG-R2 — Distinct construction and rear silhouette checkpoint

Feature branch: `feat/rig-r2-identity-harness-20261103`

## Motivation
RIG-R1 fixed the front panel contact for clothing and armor, but multiple
rigs retained the same squared U shoulder/rear geometry. RIG-R2 gives each
family a physically coherent rear load route, so the no-armor view describes
how the model stays attached. This is a visual-only release; the equipment
ledger retains authority over ammo, carrying capacity and armor protection.

## Visual identities / rear signature
| Rig | Front priority | Rear signature |
|---|---|---|
| Micro | two short primary cells + shallow organizer + flank utilities | narrow H + stabilizer |
| Placard | flat three-cell mounting face | tabs on compatible modular plate; independent compact H otherwise |
| Classic X | four independent tall cells | full crossed straps continuing to lower opposing points |
| Chicom canvas | three tall canvas flaps + two shorter flank pockets | thin crossed canvas ties + waist |
| Bandolier | asymmetrical diagonal pouch row | one uninterrupted rear diagonal, no fake H |
| Field webbing | belt-first, torso mostly empty | Y suspenders terminating at hip-mounted belt |
| LBV | tapering vest halves, open sternum | padded yoke, vertical supports, waist connection |
| Full bib | tall single front platform and separate admin shelf | broad rear support bridge |
| Split-front | two separately opening cargo wings | H harness + waist strap |
| SADF Battle Jacket | side/waist-heavy load clusters | two rear cargo compartments and shoulder yoke |

## Mounting and compatibility
Current contact fitter remains the source of exterior front/back/shoulder
surfaces, with rig-specific paths instead of a universal rear connection.
The placard interface is intentionally restricted to plate-jpc,
plate-standard and plate-heavy. A flak, police vest, slick or legacy armor
uses independent straps instead of gaining an imaginary plate-bag mount.
Lightweight, older and waist-first rigs remain physically usable over
outer armor only if their straps and hip pouches can clear its bulk.
Uncommon pairings remain selectable; the system should not silently
change character inventory or inferred historical era.

Reference touchstones: Spiritus Micro Fight and Haley D3CRM; classical
crossed chest rigs; Chicom Type 56; ALICE Y-suspenders; USGI LBV;
Tactical Tailor two-piece MAV; Rhodesian-style patrol bib; SADF P83 Battle
Jacket. Shape and relative material thickness take precedence over
miniature buckles and literal inch-to-voxel translation.

## Critical acceptance checks
- Typecheck and production build.
- Focused R2 harness, mounting, hip movement and magazine tests.
- Unarmored rear geometry for all ten; no stray free-floating ends.
- Front and 3/4 silhouettes over representative armor in the mobile lab.
- Micro and placard differ in size, layout and rear mounting topology.
- Field webbing remains hip-led, P83 remains wraparound with actual rear storage.
- Confirm previous Pages deployment complete before a release merge.

## Known follow-up after image inspection
The CI photo set is a geometry audit, not a claim of reference-perfect fit.
Review side intersections, bandolier pouch orientation, the SADF rear pack
bulk, fabric-specific strap thickness, and pose transitions in motion.
Work remains on the feature branch until the release checkpoint is green.
