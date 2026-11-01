# Texture Identity 3.0 — Visual QA and release contract

Texture 3.0 is structural pixel art with deliberate use-wear, **not** a universal noise overlay.
Use these exact Map Lab archetypes and seeds. Capture close, normal tactical, and full-map
camera positions in portrait mobile Safari; visually compare to Texture 2.0 screenshots.

| Archetype | Seed | Visual expectation |
| --- | ---: | --- |
| Clinic | 120 | Bright mint/cream, smooth linoleum, light contact wear, no gray dungeon |
| Garage | 126 | Sealed concrete, painted steel, localized work marks |
| Warehouse | 127 | Functional wood/metal shelving, industrial panels and loading surfaces |
| Restaurant | 128 | Fine warm floorboards, manufactured door finishes, service-area wear |
| Apartment | 134 | Painted trim, domestic furniture wood, warmer material relationships |
| Utility | 141 | Cinderblock, mechanical metal, purpose-specific wear |
| Office | 158 | Clean walls and carpets, gentle traffic scuffs, no speckle wash |

Asset Lab hero references: wood door, reinforced door, steel shutter, dumpster,
cabinet, pallet, sofa, tire, and exterior asphalt/grass.

## Critical merge gate
1. Focused texture/material tests, TypeScript check, production build.
2. Door and fixture render consistency, no collision, LOS, ballistics or movement changes.
3. Pixel cache bounded by the number of material types and four variants; no new per-frame generation.
4. Close/normal/overview inspection on mobile and full-map readability.
5. Real deploy succeeds, and version agrees with GitHub main. Do not equate a successful
   Pages deployment with a completed device visual inspection.

## Style
- Manufacturing and construction first, surface microdetail second, wear third.
- Wood floorboards ≠ door wood ≠ furniture wood ≠ structural timber.
- Painted steel and polymer differ materially. Dumpsters are never wooden.
- Maintained sites have restrained wear even when frequently used.
- Site condition and building function remain independent.
- Pixel size is consistent in physical units; physical motif dimensions vary.
- Maintain contrast and large quiet color areas. Fine details should disappear at distance.
