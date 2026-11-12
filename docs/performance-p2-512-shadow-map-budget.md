# P2 — 512² live shadow-map baseline (2026-11-12)

## Decision and intent
Fieldwork's miniature/representational art does not justify large real-time
shadow maps. User selected a unified **512×512 directional shadow map** as the
normal baseline, including all Breach quality presets, Operator Studio,
Operator Lab, pose authoring, Ground Zero terrain, and the art-study viewport.
This is a visual-budget change, not a modification to gameplay sight or fog.

## Changed production defaults
| Surface | Previous default | New |
|---|---:|---:|
| Breach: performance | 512² | 512² |
| Breach: balanced | 768² | 512² |
| Breach: quality | 1024² | 512² |
| Operator Studio | 2048² | 512² |
| Operator Lab and pose workbench (noncompact) | 1024² | 512² |
| Ground Zero main world | 1024² | 512² |
| Study world | 1536² | 512² |
| Operator thumbnails | 512² | 512² |

The single `src/rendering/shadow-map-budget.ts` constant is the canonical
production value. Shadow texel counts fall by 56% (768->512),
75% (1024->512), 89% (1536->512) or 94% (2048->512), with proportional
first-order depth-texture storage reduction at unchanged texture format.
No on-device FPS improvement is claimed in advance; actual shadow cost may be
constrained by CPU, draw calls, or scheduling.

## Intentional exclusions
- Authored baked receiver-shadow atlas: 64 px per face, 256×128 atlas.
- Baked geometry AO/contact masks, wardrobe camouflage images, UI,
  site surface materials, fog masks and replay disclosure.
- Shadow filtering, camera frustums, shadow update/reuse policy, caster
  selection and all lighting/cel gradients.
- Studio-only *explicit* `?studioShadowSize=1024` or `=2048` options
  for close inspection or controlled visual A/B; these do not change
  tactical quality defaults.

## Verification
- Policy tests validate all Breach presets and Studio default/overrides.
- Static budget test ensures every directly configured scene uses the shared
  512² constant and that baked atlases are not accidentally resized.
- Existing lighting/animation/material and mobile smoke protect the actual
  output and equipment detail.
- The opt-in Breach `?perf=1` overlay labels the actual directional light
  shadow-map width with `MAP 512px` next to shadow refresh/reuse counts.

## Acceptance
Compare the **same map/seed and camera** with the previous known build,
especially indoor doorframe contacts, cast shadows beneath helmets,
equipment and walls, then record RAF P50/P95 and live spike counts. A smaller
depth map can make distant cast edges more blocky; do not compensate by
silently expanding the shadow frustum, adding extra shadow passes, or restoring
expensive GPU effects without user approval.
