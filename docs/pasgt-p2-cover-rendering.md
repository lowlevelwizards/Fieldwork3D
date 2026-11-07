# PASGT cloth rendering contract — focused P2

Reference: U.S. PASGT issue woodland cover with foliage slits, separate crown
and skirt panels, wraparound stitched hem, and retained hard-shell edge.

Source shell: src/operator-headwear-silhouettes.ts PASGT_CUBOIDS
No source shell volumes are changed or scaled.

One physical cover: expanded exterior union from the *same* existing source
volumes, but its lower edges stop 0.26 model units above the true shell edge.
A tiny fabric hem follows the unequal peak, ear-lobes and rear skirt.
No second loose geometry is built.

Texture and UV:
- All vertical walls share uv1 region 0 via the union's true continuous
  perimeter mapping. No individual cuboid-face restart of print scale.
- Crown uses top-planar region 3 with a central panel seam.
- Four sector seams are restrained per-pixel stitch marks at wrapped U
  boundaries 8/16/24, not add-on thin boxes.
- Printed and plain cloth use the exact same texture path at neutral white
  material color. No vertex-color pseudo-AO multiplier or self-shadow.
- Physical shell color remains independent and visible when cover is OFF.
- Use large slits/loops as a temporary A/B audition, not permanent families.

Field geometry: three simple choices for band and four for concealment.
No modern PASGT electronics or NVG equipment assembled.
