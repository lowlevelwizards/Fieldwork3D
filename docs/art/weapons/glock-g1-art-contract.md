# Glock family G1 — miniature visual-art lock (2026-11-19)

**Status:** Feature-branch appearance previews pending actual desktop/mobile WebGL visual approval. This document does **not** claim an equippable secondary weapon, measured deployment success, or exact service provenance.

## Scope
Build real low-poly Three.js external models of G19 Gen 3, G26, G19X and G19 Gen 5 MOS, and show them in the existing standalone Arsenal page as **appearance-only 3D references**. Do not use SMG/primary weapon gameplay classes to simulate handguns. Do not issue equipment, modify ammo, persist fake pistol recipes or change existing weapon art.

## Source and style contract
- Follows [Universal Weapon Art & Production Standard](weapon-production-standard.md), with approved 870 and G36 simplification lessons.
- Authentic **family silhouette**, not a fabricated mechanism or scaled engineering model.
- Four salient silhouette masses: blunt slide; shallow continuous dust-cover frame; strongly raked grip joined to frame; a single truly open rectangular trigger guard.
- Trigger guard is **present** for pistols although rifles commonly omit it: the large empty trigger gap matters disproportionately at compact sidearm scale.
- Minimal ancillary shapes: two enlarged blocks for sights; one magazine heel; at most one batched mark surface plus right-only port suggestion. No separate trigger mechanism, finger grooves, screws, rails, fake panel lines, edge glints, or high-segment rounded barrels.
- Use existing shared palette/lighting and profile primitives. No per-frame geometry or dedicated game renderer.

## Variant shape requirements
| Reference | Distinguishing anatomy |
| --- | --- |
| G19 Gen 3 | Standard compact slide, grip and matte black material baseline |
| G26 | Shortened front slide, shortened grip, no synthetic scaling of full G19 |
| G19X | Compact-length slide with distinctly longer grip and muted tan finish |
| G19 Gen 5 MOS | Compact baseline silhouette with front serration marks and optic-ready identity; a functional optic mount is **not** implied |

Factory/role exactness is not claimed by the model names. Gallery entries use their recognizably representative art identities.

## Modeling / integration
- Authoritative real geometry: \`src/weapons/geometry/glock-family-silhouettes.ts\`, \`buildGlockAppearance()\`.
- Viewer: \`src/arsenal/glock-gallery.ts\`. One lazily created WebGL renderer builds screenshots from actual geometry and uses the existing Arsenal inspection light, with side/three-quarter/opposite/clay controls.
- The preview has no physical inventory binding and is separately distinguished from primary family recipe/workbench cards. The existing family/save schema remains unchanged.
- All gun-owned BufferGeometry instances are disposed after snapshot; global shared palette materials are never disposed.
- Slide is separately named and marked for later action animation; no slide animation, draw/holster, reload or hand-contact contract is introduced by G1.

## Acceptance and release gate
- Pass focused \`tests/weapon-glock-family-art.test.mjs\`, TypeScript and production build.
- Validate **actual** desktop/mobile Arsenal snapshots, specifically right/left three-quarter, clay side profile, 64/128px readability, actual open hole, grip seam, G26 handle and G19X long grip.
- Compare to existing actual 870 and compact MP5K (not the concept sketch) under native model-scale presentation.
- Do not call visually approved from tests alone. No main merge while an older production deployment remains pending. Verify public Pages serves expected build hash after merge.

## Future work (separate scope)
A true \`secondary\` weapon class, sidearm ownership/holster, safe and typed magazines/capacity, draw/holster states, shoulderless hand contacts, pistol reload poses, accessories and workbench configuration require an independently reviewed gameplay/interface migration. Current four appearances must not pretend to deliver those capabilities.


## G2 Fieldwork Proportion Reset (2026-11-19) — replacement art contract

**Reason:** Actual user-reviewed G1 Arsenal captures showed a slide too long/thin,
a pencil-like grip, weak frame/dust-cover relationship and a dangling box guard.
The closest Fieldwork neighbors (compact HK/MP5K, AK and R870) communicate
identity through a few BIG, connected volumes, not firearm-realistic ratios.
G2 deliberately restores the miniature language. Human aesthetic sign-off
remains pending the updated native WebGL comparison screenshots.

### Absolute G2 art datums (visual units, not weapon manufacturing specs)

| Anatomical landmark | G19 Gen3 / Gen5 MOS | G26 | G19X |
| --- | ---: | ---: | ---: |
| Slide rear X | -8.17 | -8.17 | -8.17 |
| Slide nose X | 7.52 | 5.10 | 7.52 |
| Slide bottom/top Y | .34 / 3.24 | .34 / 3.24 | .34 / 3.24 |
| Slide half-depth | 1.575 | 1.575 | 1.575 |
| Polymer half-depth | 1.36 | 1.36 | 1.36 |
| Grip heel Y | -7.22 | -5.73 | -8.20 |
| Grip heel rear/front X | -7.76 / -3.52 | -7.49 / -3.70 | -7.78 / -3.54 |
| Trigger-guard opening X | -2.37 to .87 | same | same |
| Trigger-guard opening Y | -2.94 to -1.93 | same | same |

**Intended G19 changes versus G1:** slide length ~18.8 to 15.69 art units
(about 17% shorter); height 2.16 to 2.90 (about 34% taller); depth 2.45
to 3.15 (about 29% thicker). Grip heel rises from -8.50 to -7.22
(roughly 15% shorter in the side view) and grows broader at the heel.
These values are identity exaggerations. No local scale transform shortens
the G26 or lengthens the G19X: every variant has its own authored profile.

### Positive shape and negative space
1. One **blunt low-vertex slide** with tiny nose bevels, separate named
   transform identity for future moving slide. Oversized slide-height and
   depth are intentional relative to the gun's shorter length.
2. **One connected polymer shell** for frame, raked grip and trigger-guard
   perimeter, not stacked boxes. Its one real 3D aperture must remain empty
   under all views. No floating frame wedge, duplicated handle, or
   independently drawn dangling guard.
3. One blunt magazine heel, two small enlarged sights; one optional
   batched shallow serration mesh, plus at most one MOS appearance inset.
4. **No ejection-port rectangle** in G2. No micro trigger, finger grooves,
   screws, top rails, extra guard trim, specular accents, model-specific lights
   or material-colored geometry used to rescue silhouette mistakes.
5. G26 is short and squat; G19X remains distinctly fuller without the
   long thin handle; Gen5 MOS remains compatible with the compact silhouette.
   Its shallow top inset denotes an *appearance cue*, **not** an optic mount.

### Mesh economy / audit
Factory G2 appearances target five primitive meshes in clay (slide, integrated
polymer body including guard opening, magazine heel, two sights), six with
batched serrations, seven only for the MOS top identity. Automated checks
measure actual emitted triangles with a review ceiling of 220 and validate
the 3D trigger opening via geometry raycasts. This is deliberately stricter
than the generic rifle budgets while preserving the pistol's essential hole.

### Arsenal presentation and peer comparison
- Hero/card screenshots come from the identical real Three.js builder with
  the shared Arsenal material/lighting profile. Pistol-specific close-fit
  distance and 2:1 viewport fix the prior distant long-rifle crop.
- Side, three-quarter, opposite and clay remain available.
- **MP5K PEER** mode renders the existing actual MP5K model and Glock
  with one shared camera and art-unit scale. This is an honest provisional
  art-size comparison, **not** a claim of final in-operator physical scale,
  because playable secondary rig/pose authority does not exist yet.
- Compare at desktop and mobile, actual tactical/Arsenal pixel sizes, and
  64/128px; inspect rear slide thickness, grip/guard negative space and
  G19X/G26 differentiated proportions. Only visual review may certify art.

### Protected integration
G1 appearance-only IDs remain stable; no old weapon family, primary weapon,
ammunition, inventory, simulation or save schema is migrated. This release
does **not** add functional pistol/holster/secondary interactions. Keep
separate stages for that future system.


## G2.5 Reconciliation (2026-11-19) — CURRENT authoring target, supersedes G2 datums

**Visual critique:** User's live G2 screenshots confirm the family became too squat
and block-like; the frame read as a large monolith, the guard looked thin in
relation to the thicker slide, and removing the ejection port erased a useful
recognition cue. G2.5 restores ~one-third of G1's silhouette proportions while
retaining G2's integrated 3D construction and strong Fieldwork miniature mass.

### Exact authoring targets (art units; not firearm dimensions)

| Landmark | G19 Gen3 / Gen5 MOS | G26 | G19X |
| --- | ---: | ---: | ---: |
| Slide rear X | -8.55 | -8.55 | -8.55 |
| Slide nose X | 8.30 | 5.78 | 8.30 |
| Slide bottom/top Y | .34 / 3.04 | .34 / 3.04 | .34 / 3.04 |
| Slide full depth | 2.96 | 2.96 | 2.96 |
| Polymer frame full depth | 2.62 | 2.62 | 2.62 |
| Grip heel Y | -7.65 | -6.07 | -8.75 |
| Heel back/front X | -8.05 / -4.06 | -7.86 / -4.17 | -8.06 / -4.06 |
| Guard outer front X / bottom Y | 1.76 / -3.80 | same | same |
| Guard real aperture X | -2.36 to .78 | same | same |
| Guard real aperture Y | -3.02 to -1.91 | same | same |

G19 slide relative to G2: ~7.4% longer, 6.9% lower, 6.0% less
deep; still much shorter and more massive than G1. Recovered grip length,
a more readable backstrap sweep and slightly slimmer heel avoid both
the pencil handle of G1 and the rectangular stump of G2.
This is a **selective art interpolation**, not a uniformly scaled firearm.

### Integrated guard and ejection side

- Keep the frame, grip, and guard perimeter in **one extruded polygon with
  a real hole**. Front pillar approximately 0.98 art units and lower bar
  approximately 0.78: both intentionally grow with slide mass.
- Keep the aperture visually open at miniature scale; do not plug it with
  a trigger mechanism or decorative insert.
- Restore ONE simple right-side ejection-port shadow rectangle on the
  slide: x=.58..2.53, y=2.06..2.51, on the **+Z** right side only.
  No port rectangle on left. Port is an indexed four-vertex quad within
  the EXISTING single serration mesh; no additional geometry object.
- Retain only 3 rear marks per side and 2 additional front marks per
  side for Gen5 MOS. No other external controls or screw decals.
- Five clay meshes, six ordinary detailed meshes and seven MOS meshes;
  triangle budget remains <=220. Materials remain shared with Fieldwork.

### Acceptance and protected behavior

Run the focused Glock art test, TypeScript/production build and critical
Arsenal regressions. Review native 3D hero/card, side/opposite, three-quarter,
clay and MP5K peer modes at mobile and desktop sizes. Visual approval
must come from reviewing rendered results, not merely from numerical tests.

This release remains appearance-only: no secondary weapon simulation,
inventory/save migration, ammunition, holstering or attachments.


## G2.6 Iconic Anatomy and Ejection-Port Wrap — CURRENT authoring override

**Context:** User-reviewed deployed G2.5 captures show good compact overall scale
but a still-overweight flat polymer dust-cover band, a generic grip junction,
and an ejection-port marking too small and too low. Make the iconic Glock
features carry more of the identity *without* changing the established slide
envelope or turning the weapon into detailed CAD.

### What stays frozen
- G19 / Gen5 slide X: -8.55 to 8.30, Y .34 to 3.04, depth 2.96.
- Same slide mesh and exaggerated squared-off chamfers, two sights,
  one magazine heel and one **integrated** open frame/grip/guard shape.
- Single shared material palette, one detail mesh for the entire family
  with no extra draw calls for the ejection port.
- Existing side/quarter/opposite/clay/MP5K peer Arsenal modes and all
  appearance IDs. No sidearm gameplay/loadout/save changes.

### G2.6 silhouette changes (art units)
- Front dust-cover lower edge moves from -1.23 up to -1.01 at the
  muzzle; slight stepped slope via x=3.00 y=-1.07 to x=1.76 y=-1.24
  where it joins the front guard. Preserve a strong connected polymer
  body: no detached strip.
- Backstrap uses two purposeful, low-vertex contour facets at
  heelY+1.23 and heelY+2.64 to smooth the heavy G2.5 corner.
  Keep the grip broad, solid and tilted; no finger grooves.
- G26 grip heel Y rises from -6.07 to -5.88, leaving its short
  nose at 5.78: still squat but immediately identifiable as subcompact.
- G19X grip heel drops from -8.75 to -8.96 and widens toward the
  front heel from -4.06 to -3.82 (rear -8.11); fuller, not just tan.
- The trigger opening remains physically open and integrated; front
  pillar and bottom rim are still substantial.

### Ejection-port landmark specification
- **One visually continuous L-shaped dark panel** on the slide's
  **right (+Z) side plus top (+Y)**, not two overlapping rectangles or
  a cylinder/real open cut through the slide.
- Same constant X interval .26 .. 3.41 (width 3.15 art units).
- Side panel Y 2.11 .. 3.058, Z=1.498; top panel Y=3.058,
  Z=.36 .. 1.498. This sits high on the slide with a graphic top wrap.
- Construct with **six shared vertices**, **four triangles**, inside
  the EXISTING serration-mark BufferGeometry; two triangles side,
  two top, sharing the two outer-edge vertices.
- The port is visible only from the right and from above, and
  deliberately absent from the left slide face. Remove it entirely in
  monochrome/clay or details-off mode, keeping silhouette tests honest.
- The port is a stylized *color plane*, not operational chamber
  engineering. No depth, recess bevels, ejection path, faux moving barrel
  or additional mechanism.
- Keep only 3 rear serrations each side, 2 optional Gen5 front each side,
  and a separate subtle MOS plate as before.

### Verification
Focused geometry tests must verify the real opening, variant body bounds,
5 clay / 6 normal / 7 MOS meshes, <=220 triangles, +Z and +Y port
face orientations and shared-edge geometry, TypeScript / production build,
and critical integration smoke. Actual WebGL snapshots need human review;
CI success is not equivalent to final aesthetic approval.


## G2.7 Identity Lock — current lower-frame, material and comparison contract

**Goal:** Maintain the user-reviewed G2.6 slide proportions. Improve authentic
recognition through guard, grip and material relationships rather than scaling
whole guns or adding ornamental mechanism detail.

### Geometry / silhouette
- Freeze the G19 / Gen5 envelope: rear=-8.55, muzzle=8.30,
  slide Y=.34..3.04, slide depth=2.96. G26 nose=5.78 and G19X
  heel remain variant-authored; no uniform scaling.
- One continuous polymer frame, grip and open guard extrusion:
  lower edge y=-3.88; guard pillar front x=1.76.
- The new **five-point true opening** is (-2.25,-1.72),
  (.83,-1.72), (.83,-3.13), (-1.98,-3.13),
  (-2.25,-2.82). Compared with G2.6 it is approximately
  27% taller, while lower rim remains ~.75 and front pillar ~.93.
  The diagonal rear corner clarifies guard-to-frontstrap continuity.
- Replace the old pinched-V backstrap with two broad facets at
  heelY+1.28 and heelY+2.55 leading to (-7.03,-2.64),
  (-7.26,-2.13) and rear (-8.43,-1.39).
- No new micro finger grooves or dust-cover rail notches. Those were
  evaluated against normal 64/128px silhouette readability and rejected
  for insufficient identity benefit. G26 retains its shorter rail-less
  visual profile, without fictitious decorative rail marks on G19.

### Materials and identifying landmarks
- Keep classic upper/lower shared black-steel/polymer hierarchy.
- G19X: existing AR muted FDE polymer and new shared **slightly
  darker coyote steel** upper. Both are pooled finishes, not per-model
  material instances or game/save identities.
- Keep the G2.6 right (+Z) to top (+Y) six-vertex wrapped port
  and reduce contrast via one shared medium-dark Glock port material.
  Serrations still share exactly that one existing surface mesh.
- Tiny front muzzle-face symbolic mark uses four additional vertices,
  two triangles on +X in the **same batch**. No new mesh or fake barrel
  mechanism; omitted in monochrome/detail-off preview.

### Comparison contract and acceptance
- Arsenal **FAMILY SCALE** shows the real four 3D models in one
  scene, in two rows of two, using exactly **one common camera,
  native art-unit scale, distance and lighting**. There is no
  per-card zoom. Top row G19 Gen3/G26; bottom row G19X/Gen5 MOS.
  Shorter G26 and longer G19X must remain visibly distinct.
- The existing MP5K peer view remains provisional until a true
  secondary rig provides a final operator-contact scale.
- Keep 5 meshes in clay, 6 normally and 7 MOS, <=220 emitted
  triangles; no new independent draw surface.
- Require raycast checks through the aperture, face-normal checks
  for muzzle/port, material-cache identity tests, close-view and
  common-scale mobile/desktop review, and critical build regressions.
  Technical tests do NOT certify the model's aesthetic success.
- Appearance-only. Never change primary weapon recipes, inventory,
  saved loadouts, ballistics, ammunition, reloads or operator poses.
