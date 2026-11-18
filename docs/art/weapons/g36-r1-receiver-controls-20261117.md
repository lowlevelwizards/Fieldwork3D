# G36 R1 — receiver and controls rebuilt to match H3 economy

**Review input:** November 17 Arsenal mobile screenshot `IMG_8802.jpeg`. User accepted the H3 minimal handguard, but called out a mismatched receiver, too-low integrated dual optic, a charging handle disconnected from the ejection port, ugly vertically banded magazine shading, and selector too far rear/low.

## Stage A — two blunt polymer body masses
- Re-profile **only** the existing upper and lower receiver meshes: a straight roof, one rear roof shoulder, one large angled front transition, and a shorter, cleaner lower magwell cheek.
- No trim meshes, bevel ladders, panel strips, extra trigger guard, rails, new accessory parts or subdivision rings.
- Preserve original stock hinge, H3 handguard attachment, open trigger gap, grip silhouette, G36-specific magazine and barrel.
- One 6-corner upper (20 triangles), one 8-corner lower (28 triangles), no new meshes.

## Stage B — optics physically above the carry handle
- Move the complete production factory dual-optic housing/lower eyepiece/upper hood/upper eyepiece/lens discs together **+0.42 vertical art units**. No pedestal or extra rail.
- Move the integrated sight reference coordinates by the SAME 0.42: lower 3.57 → 3.99, upper 4.46 → 4.88. New optic crown 5.03 → 5.45.
- Preserve relative housing silhouettes, lens sizes, optical identity, saved six-slot factory identities and longitudinal offsets. Historical P6/P7 review alternatives remain their historical unmodified art variants.
- Sight pose/contact evaluation must remain consistent with the visible lens centers.

## Stage C — charging tab and selector placement
- The right-only atlas ejection port spans X -1.45 to +1.72 and Y 0.03 to 0.80.
- Place one simplified side-facing charging tab **X +0.12, Y +0.92, Z +1.25**, aligned over the ejection port's X center, intersecting the receiver exterior; remove previous central roof-spanning slab (X -.65, Y 1.51, Z 0, width 2.68).
- Move the two pre-existing HK selector hubs from (-5.20,-1.96) to **(-3.95,-1.14)** on both sides; inherit the shared eight-sided pivot and paddle, no new mechanisms.
- Preserve the graphic right-only port without a mirrored left fake.

## Stage D — magazine finish
- Retain the distinct G36 polymer magazine mesh, smoky polymer material and its opaque/cached single atlas material.
- Remove the false rectangular panel, vertical bands and dark base stripe **from both magazine UV tiles**: uniform white atlas texels leave the material itself to provide the value.
- No transparency, additional maps/meshes, new ribs or changes to ammo feed/reload/capacity.

## Scope and release
- Update the existing G36 P4/P6/P8/O2/O3 focused assertions and add the R1 shape/alignment/material acceptance to the dedicated G36 workflow; TypeScript/build and actual WebGL peer/mobile captures.
- No combat stat changes, other weapon families or stock/handguard retuning. G36-only factory visual sight-contact migration by +0.42 is intentional.
- Feature-branch review first; do not merge or deploy until CI and user visual acceptance. Original H3 live stays available as rollback.
