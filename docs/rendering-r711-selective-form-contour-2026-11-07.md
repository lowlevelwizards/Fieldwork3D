# R7.11 — Selective contour and restrained form shading
2026-11-07 · Fieldwork Breach · Studio-only audition

## Design contract
The approved normal renderer is untouched unless the Lighting Lab is opened
with explicit preview settings. Two-band graphic cel stays at a suggested 70%
shadow cutoff. Saturated plum remains the **only colored fill audition**.
Height shading is a restrained secondary value cue; rim accent is sparse and
hard-surface-specific. Preserve materials, camo patterns, IK, combat, replay,
visibility and saves.

### Height shaping
- `Original`: existing approved Standard presentation.
- `Soft grayscale` (`piece`): local lower 0–100% gradient with at most
  19% attenuation toward the bottom, no purple/blue tint.
- `Dusty gray-rose` (`piece-rose`): the same luminance shaping plus a
  deliberately faint warm/rose component, never another purple fill.
- Each source mesh / original merged pouch span receives a bottom-to-top
  normalized attribute; only sourced height values are sampled. No
  additional draw call for previously merged rigid gear.
- **Exclude** upper arms, forearms and thighs (including their child sleeves
  and trousers). **Include** shins, shoes/boots and hands/gloves through exact
  parent/child IK tags. All other visible opaque gear remains eligible.
- The baseline vertex-lighting system is kept neutral under these profiles;
  no per-frame CPU geometry re-baking or new raycasts.

### Rim
- `Off` or `Hard-surface contour`, initially **10%**, adjustable 0–20%.
- Eligible: gun/attachment meshes, explicitly marked metallic surfaces,
  and the approved headwear shell material **only if the shell is uncovered**.
- Ineligible: uniforms, pouches, soft rigs, exposed skin, goggles/lenses,
  covers, straps, plate carriers made of cloth and other nonmetal surfaces.
  Prior broad `fieldworkRimRegion=hard-shell` tags on carrier groups must
  not accidentally opt them back in.
- Use a single shared, transparent, backface-only, normal-extruded outline
  material per Studio operator with 0.32 unit extrusion and white/cream tint.
  Its visibility is constrained by the original object's depth; it draws
  true projected outer edges instead of object-space pixel-pattern islands.
  This **does** require an additional draw per eligible mesh, deliberately
  restricted to this small set. Do not claim zero extra draw cost.
- No fullscreen postprocess or extra scene light. Updating rim amount changes
  the shared material opacity without rebuilding the entire rig.
- Cover switches resolve PASGT / modern H1 / M1 cover semantics dynamically,
  before applying eligibility. Bare-shell material identity is explicit.

## Focused verification
1. Per-piece bounds are monotonic and independent even within merged gear.
2. Body tags prohibit upper legs and arms but allow shins, boots, hand/glove.
3. True backface contour lives on weapon/metal/uncovered-shell meshes only.
4. Switching a cover on immediately removes its helmet contour.
5. Pose cavities and RGB camo survive cel + form shaping.
6. Mobile Studio controls, compare/reset, changing gear and weapon preview
   render without shader compilation errors.
7. Verify only the previous Pages deployment is serving live, with a clear
   production queue; release just once at the checkpoint.

## Deferred art/performance measurements
Compare physical iPhone GPU frame time, memory, program count and
Studio warm-reopen A/B. Human approval of line width and hue remains
required before activating any treatment in tactical gameplay.
