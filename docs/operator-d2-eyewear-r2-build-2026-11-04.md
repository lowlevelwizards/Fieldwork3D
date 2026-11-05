# D2 eyewear R2 silhouette reset

Base head: cubic 8 x 8 x 8, local -Z front, +X right, +Y up. The R1 all-frames-are-wide test is retired: each type must be recognizable from front, 3/4 and side, in identical matte black with no textures or tint.

## Construction rules
- One extruded **solid frame** with 1–2 physical apertures (not per-edge box bars). A single polygon includes the entire frontal lens housing and actual voids. A lens sheet is a separate transparent material a short distance behind the near face. No skin-colored fake glass.
- Build deliberate per-model proportions and YZ side-fins; no repeated universal arm geometry.
- Large 4–8 corner cuts. No decorative hinges, bolt strips, microbevels, extra frame lines.
- All models built once, visibility controls only. Never add geometry in pose/update loops.
- Material references (frame, lens, strap) remain shared, so Studio swatches persist and downed-desaturation stays reversible.
- Keep all style IDs and `rectangular`/`round`/`heavy-square` modes; goggle positions `eyes`/`forehead`/`helmet`/`neck`; existing save format.

## Target readable archetypes
standard=square block / aviator=descending pilot teardrops / wrap=twin angular swept wedges / shield=one tall visor plate / low=compact enclosed seal / field=deep brutalist dust box / retro=two projecting faceted cups.

## Anti-regression acceptance
R2 tests inspect actual solid-frame bounds and aperture counts, front projection, key side construction and geometry reuse, as well as the saved material and wear-position contracts. Mobile snapshots are final silhouette acceptance, not mere automated geometry green.
