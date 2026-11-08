# MF-3 — Diorama lens / tilt-shift
## Intent
A **photographed miniature set**: crisp horizontal focus band across the *screen*,
increasing optical softness in the upper and lower frame. Not a site-bounds mask.

## Shipping behavior
- Subtle: **default** live, center 56% from top; inner half-height 15%, outer half-height 34%;
  6px first/second blur sampling radius, max .82 blend; saturation ×1.045, contrast ×1.02
- Replay: stronger photographic profile, center 54% from top; inner 11%, outer 30%;
  9px radius, max .94 blend; saturation ×1.065, contrast ×1.035
- Strong: stronger profile during live and replay; Replay Only: only during replay
- Preferences: Off / Subtle / Strong / Replay Only (saved to localStorage)
- `?focusDebug=band`: visible band guides; also legacy `mask` and `protected` diagnostics
- Gameplay: fixed center. Replay Director: slow subject bias with ±8%-height
  deadzone, .6s interpolation, clamp .44–.68, no camera changes.
- Do not blur 2D plans/HUD; worldspace noncritical scenery is intentionally allowed to blur.
- Protect only selected friendly (or up to 2 director featured subjects) with small projected discs.
  Never use undisclosed enemies to drive focus. No room or floorplan focus protection.
- Performance/TOP/Floor Plan/bodycam: bypass; Off is pixel-identical native scene draw.

## Rendering pipeline
1. Draw 3D scene to original visible framebuffer using existing ACES/sRGB and fog materials
2. Copy resolved **already encoded** display pixels to FramebufferTexture (NoColorSpace)
3. Downsample/horizontal Gaussian 7-tap blur to width/4 × height/4 target
4. Vertical Gaussian 7-tap blur at quarter resolution
5. Composite full frame using Y-only tilt-shift band; discard protected center
6. Slight saturation/contrast only in the blur contribution; no second tone mapping
7. Tactical 2D overlays and HUD render afterward, unchanged.

No depth CoC, temporal accumulation, bokeh, chromatic aberration or camera cuts.
Never mutate simulation, fog intel, order endpoints, or framing. Target memory:
one screen capture + two quarter-resolution RGBA8 targets; reallocate only when
drawing-buffer dimensions change; no unbounded allocation per frame.

## Critical release gates
- Typecheck and production build.
- Policy test: both outer regions blur at every map coverage; central band stays sharp.
- Real WebGL smoke default, off, subtle, strong, replay only, debug band.
- Static fixture: center exact parity; top and bottom visibly differ from Off;
  repeat identical static frame does not flicker.
- Previous GitHub Pages deploy succeeded and exact live build was verified.
- Merge as logical release batch, then inspect Pages served release ID.
- On-device thermal and actual visual tuning **not** claimed unless performed.
