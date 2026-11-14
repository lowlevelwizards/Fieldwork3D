# H25 — Midwall ear shoulder, fitted cloth edge and clean retention

## Visual objective

The H24 shell bulge was only authored in lower-hem X positions, so from normal three-quarter views it still read as a flat-sided cubic helmet. In H25 the bulge begins **halfway down the helmet wall**, independent of the front-to-back ear cutout. The six YZ hem stations, ear opening heights, and nape depths are unchanged.

## Geometry

The shell adds one mid-sidewall station per existing six longitudinal points. The station's local Y is `shoulderY + (hemY-shoulderY) * .52`; x is a six-point width profile, mirrored exactly left/right. Peak X on each side is Full 5.80, Mid 5.74, High 5.60, on the two ear-area stations; front and rearmost widths remain unchanged. This is a single mesh, one draw call, no extra per-frame work or separate intersecting ear boxes. Side-wall quads rise from 29 to 39 (shell triangles 58 to 78). Shadow-facing underside folds are retained.

The camouflage cover uses *matching* shoulder stations instead of stretching from crown directly to hem. The cover's intermediate flare ring follows the same X width profile and Y placement, with small static surface clearance. Its lower hem goes below the actual shell edge (`hemY-.14`) and a separately generated inward turn finishes underneath, without exposing the shell-color rubber binding. Bare helmet appearance retains the visible molded edging, which already has uniform diagonal normals.

The retention uses a shared Y vertex beneath the implied ear, at approximately X±4.62/Y1.14/Z−0.35. Front and rear legs taper to that vertex rather than stacking rectangles over a broad plastic-looking cheek block. The chin diagonal turns outside the face near X±4.46/Z−4.36, retaining the existing fitted chin cup and distinct unfastened retention. Two angular hardware buckle quads follow the lower strap. A finished fastened retention geometry now requires 12 triangles instead of 18; the fastened assembly remains one static consolidated webbing material.

## Invariants and checks

- Existing shell ear/nape YZ dimensions and all six longitudinal cut stations remain identical.
- Six profile samples and one shell mesh; the 20 static shell triangles buy a visible ear shoulder, not decorative plates.
- One fitted cover material and texture UV atlas, attached sample points use the generated surface as before.
- Covered: bare edging hidden; underfold dark; cover extends below lip and outside ear shoulder.
- Fastened: exactly mirrored paths, clear head front and jaw; no redundant junction caps.
- All geometry rebuilt only on wardrobe/equipment updates. No added physics, collision checks or per-frame runtime logic.
- Run critical structural tests and typecheck/build; mobile Operator Studio visual smoke, performance and save recolor checks; merge/deploy only after clean integration, verify Pages expected build stamp.

Scope explicitly excludes changes to PASGT and FAST families, tactical pathfinding, fog or animations.
