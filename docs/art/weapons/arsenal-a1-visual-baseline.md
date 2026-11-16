# Arsenal A1 — read-only visual baseline (2026-11-16)

## Boundary
**No recoloring, geometry edits, save migrations, Campaign or Quick Play changes.**
A1 records existing authored factory reference configurations, not every possible custom build.
The standalone legacy shotgun is outside the seven modular Arsenal platforms and is a later art pass.

## Run
- node >=22, npm install
- \`npm run audit:arsenal-a1\` writes \`reports/arsenal-a1-manifest.json\`
- Open \`http://localhost:5173/arsenal-a1-capture.html\` with \`npm run dev\` to inspect the live contact sheet.
- With optional Playwright installed, \`node scripts/capture-arsenal-a1.mjs\` captures \`reports/arsenal-a1-contact-sheet.png\`.
- A dedicated branch CI workflow runs focused tests, TypeScript, build, the inventory and WebGL screenshot; generated files are uploaded as artifacts, not committed.

## Evidence and interpretation
The contact sheet uses the actual production \`buildWeaponSilhouette\`,
\`buildWeaponAccessories\`, \`weaponVisualLayout\`, graphics output and Arsenal inspection lighting.
Every factory receives **the same orthographic framing**: side, three-quarter, top,
and a grayscale treatment of the exact side render. Grayscale is a perceptual comparison,
not a replacement material or alternate game mesh.
The contact sheet uses factory defaults without added optics, suppressors or lights;
A3 will separately review attachments.

The JSON manifest records factory IDs, authored parts, render scales,
actual transformed bounding boxes, meshes, GPU triangles (including instances),
vertex counts, mesh distribution by family slot, material roles, color hexes,
roughness, metalness and whether a material uses a pixel map.
Material counts are **drawn mesh appearances**, not memory allocations or
a unique-material-GPU-memory estimate. Triangle counts include the default body
and accessory mesh tree, including non-shadowing pixel marks.
Orthographic browser screenshots show the true WebGL material response;
the static JSON is a structural census, **not** a replacement for human art review.

## Visual review questions
1. Can the family be recognized from the grayscale side silhouette at standard size?
2. Does the three-quarter silhouette have real thickness and clean intersections?
3. Are receiver steel, polymer, magazine, wood, and highlights coherent?
4. Are important differences between factory variants visible without invented ornament?
5. Are any bright marks or details unreasonably prominent relative to FAL/FNC?
6. Is anything floating, clipping, or rendered as an inconsistent shape?
7. Does each platform retain the intended faction/era-specific authentic identity?

## Checkpoint
A1 acceptance requires a complete contact sheet, 35/35 IDs, a JSON manifest,
focused tests and no material/geometry source changes. Visual problems are
recorded as later A2–A7 work, not silently corrected during capture.
The branch is intentionally **not merged or deployed** at this checkpoint.
