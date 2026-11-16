# E6.13 — Briefing-aware idle 3D

## Ground truth after E6.12

Four fresh Chromium SwiftShader E6.12 runs proved their 90 post-READY
samples were 100% **idle/planning**, 0% live simulation, yet each sampled
callback submitted the full 3D scene. Their p95 RAF gaps were ~367–550ms
versus p95 tactical callback wall times ~42–56ms. Most gap time was
between callbacks. This does **not** establish iPhone GPU time or combat FPS.

The mission briefing is a floating, opaque-ish dossier on a translucent
69% dim/blur tactical-sheet shield. The surrounding image is still visible,
so the optimization keeps its **last complete frame**, rather than replacing
it with blank content or disabling WebGL.

## Change

Only for `phase==='planning'`, non-replaying, ordinary idle mode, an open
briefing, and a real 3D camera:
1. Draw each newly created scene once. Never hold a site that has no
   submitted 3D scene or that changed session.
2. Keep the completed static tactical image while the dossier is open.
   The normal RAF, canvas UI, input handling, HUD and focus remain active.
3. Upon dossier dismissal, force a new 3D submission in the **next RAF**
   even when the phone's ordinary idle 30Hz cadence would have deferred it.
4. Do not hold active execution, replay, photo capture, the 2D plan view
   or Studio presentation. Existing fog, shadow and material settings remain
   identical, and the first-frame prewarm path is unaffected.
5. Keep a canonical `?briefingIdle=0` baseline A/B flag.

No simulated time or operator movement is skipped. Planning scene updates
only animate presentation; the last complete image is retained while it is
dimmed/blurred, then refreshed when the overlay closes.

## Evidence and acceptance

The E6.13 browser harness uses fresh Chromium/SwiftShader processes at
390×844, seeds 23/97, and briefing-idle ON/OFF. It checks:
- 90 real tactical idle callbacks and 0 live callbacks in every run.
- At most 4 3D submissions behind the briefing with the optimization,
  versus at least 85 submissions in the baseline.
- A real WebGL draw after clicking the briefing close control, within
  the next frame, and no browser exceptions.
- Actual screenshot artifacts of the recovered scene for manual/automated
  comparison (no claim of visual parity until images have been reviewed).

The browser and driver may schedule RAF far slower than 60Hz under
software rendering, so count draw submissions and actual scene snapshots
rather than claiming iPhone framerate improvements from JavaScript timing.

## Release policy

Commit stages on the feature branch, run the focused policy and startup
regressions, typecheck and real-browser acceptance. Merge only when the
prior GitHub Pages deployment is serving its expected SHA and all
applicable critical regressions pass. Verify the new public Pages SHA
after production deploy.
