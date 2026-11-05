# Eyewear R4 — visual art direction and release gates
R3 observed on phone: standard specs too centered and arms buried in 8-unit head; aviators too U-shaped at top; wraparounds resemble a narrow mask; shield acceptable; low and field goggles too alike; vintage cups read as binocular barrels.

## R4 authored identities
- Standard acetate: broad two apertures, heavy upper rim, exterior contoured hinge/temple.
- Aviators: tall rounded pilot shoulders, broad teardrop, exposed double bridge, light metalwork.
- Shooting glasses: replace wrapabout twin-frame with one angular swept sporting lens, deliberately deep nose relief, large brow, no lower perimeter.
- Ballistic shield: quiet borderless shield, clean simple supports.
- Low goggles: distinct W-shaped open field and tightly sealed shallow face-fit.
- Field goggles: large bunker-like body, bold nasal arch, separated material gasket.
- Vintage motor goggles: two shallow faceted circular ports set into connected leather backing.

## Engineering
Keep all IDs, tint/frame swatches, option migrations, goggle poses and deferred construction.
R4 temple stations must stay outside X±4 at shoulder/rear; join at front outside corner.
All new art geometry allocated once; no update-loop rebuilds. Material count stays coarse.
Critical tests: drawn shape bounds; silhouette identities, temples, fit clearances;
wearable poses; color/persistence, existing lazy Quick Play tests, production build.

Release gates: stage commits on feature branch; merge grouped compatible stages
after focused tests and no live Pages deployment; verify public build stamp.
Screenshot approval remains a separate artistic checkpoint.
