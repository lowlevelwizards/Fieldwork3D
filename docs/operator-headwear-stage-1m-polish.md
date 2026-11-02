# Stage 1M — Final headgear silhouette polish

Bundled, **subtractive** pass on the five previously authored Stage 1L silhouettes. No new wardrobe item, no materials, and no changes to head anatomy, rig, animations, persistence, weapon behavior, or the approved ACH/high-cut geometry.

## Final form corrections

- **Patrol:** One fitted band now 1.38 units tall (was 1.14), top Y6.02; lower fitted edge stays Y4.64. The crown top, head fit, and single anchored bill are untouched.
- **Boonie:** One fitted band now 1.54 units tall (was 1.20), top Y6.08; lower edge stays Y4.54. One uninterrupted brim with no decorative drop sections remains.
- **Beanie:** Folded cuff now 2.09 units tall (was 1.75), top Y5.835; lower edge stays Y3.745. Crown remains tall at Y8.475; only two visible forms.
- **PASGT:** Eliminate the 0.10-unit projection in front of the main shell created by the two temple cuboids (their fronts now align to Z−5.025). Rear nape top and ear-lobe tops now share exactly Y6.01 instead of differing by 0.03. Keep the distinctive visor peak, low skirt, and authentic ear/nape coverage.
- **SSh-40:** All four sectors of the lower flared rim now share center Y4.30, thickness 1.10 and continuous outer dimensions X±5.30, Z±5.53. Previously tiny left/right corner deviations and unmatched heights generated distracting short edges. Adjust the rear bowl to join the new rim without an unmotivated hanging tab. The substantial integrated rim is still only 0.30 wider on each side than the 10.0-wide bowl.

## Design principle

The source code still uses four physical sectors to model a fitted, hollow perimeter; those sectors must read as **one** uninterrupted band. No number-of-cuboids shortcut may fill the operator's head or face. There are no new decorative strips, seams, rails, accessories, or material passes.

## Verification

Focused tests check unchanged facial openings, the band/cuff positions, PASGT brow seam alignment, exact steel rim sector alignment, SSh-40 shallow flare, maintained stage 1E ACH/high-cut dimensions, the one-mesh union contract, and the production build/typecheck. Actual iPhone front/side/3⁄4 aesthetic approval is the remaining visual gate; passing code tests must not be claimed as visual approval.
