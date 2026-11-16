# A2.0 — Shared Arsenal material contract
Date: 2026-11-16. Baseline: A1 feature branch, successful 35/35 factory capture.

## Artistic intent
Treat AR, AK, G3, HK33/HK53, MP5, FAL and FNC **equally** as approved
models whose finish and material relationships can all be improved.
No family is a locked color standard; each should remain distinctive.

## Single authority
- Authored finish specs live in \`weapons/geometry/weapon-material-registry.ts\`.
- \`weapon-visual-palette.ts\` exports the existing names as compatible aliases
  for saved geometry/tests; no parallel constants describing the same finish.
- \`rendering/material-identity.ts\` remains the shared world role taxonomy.
- Factory paint, dyed polymer, stained wood and stamped steel must not be
  flattened to one gray/green value. Substrate response is shared; color is authored.
- Alias an identical material only when the authored **color, role, roughness,
  metalness and surface flags** match. Sharing is by signature, not by similarity.
- Cached materials are owned by the registry for application lifetime. Callers
  dispose owned geometry, not these global materials. No per-frame construction.
- UV/atlas variants are distinct cached materials and may clone a base surface.
- Generic weapon accessories use the same registry across gameplay/Arsenal
  while keeping current geometry, mount coordinates and hidden light lens.

## Scope and invariants
No physical shape, UV, bounds, ammunition, save IDs, attachment compatibility,
weapon contact, or gameplay lighting changes. A1 geometry census: 35 presets,
891 meshes, 18,298 triangles across all default factory models. Changes are
finish definitions, PBR responses, material aliasing and accessory parity only.
Shaded 3D comparisons must be judged at fixed lighting and scale; shadow/black
pixel-mark planes are deferred to A4. Shotgun legacy fallback remains valid.

## High-value audited exceptions
- AR/AK polymer/wood originally inherited .05 metalness from a helper;
  normalize to appropriate .015/0 response.
- AK top-cover pale Lambert stamp (.90978f) lacks semantic role and looks
  brighter than the other subdued metal relief: convert to shared tagged PBR.
- Generic preview attachment steel (#707875) is much brighter than actual
  receiver steel and independently allocated per viewer. Use semantic shared
  accessory finishes instead.
- FAL/FNC existing palette aliasing is useful but is **not protection** from
  color or response improvements.
- Swatches in \`arsenal/finishes.ts\` should stay derived/verified against the
  authoritative finish definitions. No new exposed finishes or saved part IDs.

## Stage/release gates
A2.1 registry and cache; A2.2 finish responses; A2.3 family/AK exceptions and
swatch parity; A2.4 accessories and viewer ownership; A2.5 35-preset +
accessory visual captures and focused regression tests; A2.6 release checkpoint.
Commit each compatible stage on feature branch; merge only after CI, visual
review and deployment-slot checks. New releases must not overlap an existing
production Pages deployment.
