# Miniature Focus — shelved (2026-11-08)

Status: **disabled for ordinary live gameplay and replay**. The experiment
was too costly relative to its visual benefit at this stage.

MF-1 through MF-4 (tilt-shift, selective blur, fog-aware attention)
remain in the repository as dormant code for possible future study.
Do not continue tuning without renewed approval.

## Runtime guarantees
- Default mode is **Off**, regardless of previously saved Subtle, Strong,
  or Replay Only values in localStorage.
- Preferences controls remain in source but are hidden from ordinary users.
- The native single scene render is used; no additional fullscreen
  framebuffer copy, blur targets, attention-mask updates or texture uploads.
- Standalone `?focusDebug=...` cannot activate the dormant effect.
- Developers can explicitly opt in with `?focusFx=subtle`,
  `?focusFx=strong`, or `?focusFx=replay`, optionally combined
  with `?focusDebug=attention`. This is not a shipping feature.
- Future reinstatement should require both perceptible visual improvement
  and measured iPhone GPU/frame-pacing benefit relative to baseline.
