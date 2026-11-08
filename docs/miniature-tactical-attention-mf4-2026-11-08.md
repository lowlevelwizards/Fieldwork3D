# MF-4 — Tactical-attention miniature focus

## Concept
A photographed miniature / tilt-shift lens, subordinate to confirmed tactical
knowledge and current player attention. The screen's photographic blur shape
remains, but **the action determines where blur is allowed**.

## Priority and defaults

| Importance | Source | Blur |
|---|---|---|
| P0 critical | Selected friendly, visibly disclosed suspect/civilian, selected door/target, visible active shot | Zero inside protected area |
| P1 active sight | Live geometrically occluded friendly LOS polygons | Zero (all current active cones) |
| P2 recently discovered | Newly added **seen** 20-unit fine-ground cells; previously observed hostile position only | Full protection for 2.4s, ease out by 3.6s |
| P3 context | Visible non-selected teammates | Partially protected |
| P4 background | Known inactive rooms, distant architecture, exterior off current sight, opaque unexplored FOW | Miniature tilt-shift allowed |

- P0/P1 protection acquires immediately when the focus matte updates (<=.1s).
- Protection releases with half-second exponential easing; not abruptly.
- Area is built from **already displayed** actors or live confirmed cones.
  Never use undisclosed hostile positions or later replay knowledge.
- Historical replay **does not recompute LOS** from the completed simulation:
  use displayed historical actor rigs and explicitly featured friendlies only.
- Rewinding, replacing a mission or changing Floor Plan resets prior matte
  and discovery history.
- No auto-room reveal, fog-of-war mutation, camera movement or AI change.

## Photograph controls
- Subtle default: 3.6px separable blur base, strength .62, saturation ×1.02,
  contrast ×1.005; much calmer than MF-3 (6px/.82).
- Strong / replay remain distinct photographic profiles.
- All modes remain selectable in existing Preferences.
- Camera zoom-in and screen-filling focused room *smoothly* suppress strength
  to **zero**. Zero skips the extra post-process work after rendering the
  normal scene, so close-up interaction is fully sharp.
- In wide views, out-of-sight background is allowed to soften.

## Technical architecture
- 3D scene gets rendered exactly once to the original calibrated framebuffer.
- At ~10 Hz, a bounded quarter-resolution CPU Canvas2D matte draws projected
  live vision polygons and graded attention discs. Texture reused for other
  frames; no 60Hz LOS geometry query.
- At most 96 20-unit newly revealed ground samples retained for 3.6s.
  Memory only follows the game's seenGroundRevision.
- CPU matte decays smoothly and uploads a quarter-resolution NoColorSpace
  grayscale CanvasTexture. The composite uses `tiltShiftBand *
  (1 - tacticalAttention) * zoomStrength`.
- Three.js color management stays untouched. Blur operates on final display
  pixels; the sharp original survives via shader discard.
- Contrast disagreement between sharp and blurred source suppresses blur
  over strong fog/material boundaries to reduce sampling bleed across
  concealment edges.
- HUD and other 2D tactical overlays render after 3D and remain crisp.
- Off, Performance, Floor Plan, TOP and Bodycam avoid the effect.

## Diagnostics and QA
- `?focusDebug=attention` shows the grayscale attention matte. 
- `?focusDebug=band` and existing mask/protection debug remain available.
- Focused policy tests cover priority, timing, zoom, and fog guard.
- Real WebGL smoke validates gameplay, preferences, and a static screenshot:
  top/bottom blur exists; critical attention patch is pixel-identical to
  native; unrelated background remains blurred; no same-frame color shifts.
- Physical iPhone frame pacing and thermal stability must be separately
  assessed before claiming on-device approval.

## Design constraint
A totally sharp frame is **correct** when the user is zoomed into a room
or currently observing new information. Blur is a composition aid, not a
constant visual quota.
