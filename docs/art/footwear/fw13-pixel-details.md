# FW13 — footwear graphic surface pass

- Hiking boot toe prism removed; rubber region painted onto a single upper shell. Lower upper edge is seated beneath the existing sole top, avoiding nearly coincident faces.
- Shared 64×64 nearest-sampled pixel atlas per shod style; 3–4 bold instep lace strokes, extra short shaft lace rows where applicable. No lace meshes, decals or added draw calls.
- Combat and hiking boots have broad stepped side fabric blocks and sparse weave pixels. Leather and sneaker sides remain simple. Hiking shoe and boot toe regions are dark printed rubber.
- Existing colorways, skin, ankle anchors, lazy allocation, sole footprint and pose solver remain unchanged. All art is deterministic and reusable in Studio, Lab, thumbnail and gameplay render paths.
- Regression tests cover atlas identity, contrast, tile placement and absence of overlapping toe/lace meshes. Actual gameplay-distance art review remains required.

## Physical pixel scale
Uses the shared PIXEL_WORLD_SIZE (currently one world unit). The 64×64 atlas is only storage: upper caps use direct world-coordinate UVs, all perimeter faces use true unfolded surface arclength, and shaft UV height compensates for normalized shin length. Laces are one art pixel thick with two or three broad rows; canvas is deliberately coarse. Triangle-edge UV length regression checks every upper and shaft face on all shod variants against the shared gear density.
