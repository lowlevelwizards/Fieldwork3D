# E6.19.A — transparency source and ordering audit

E6.18 measured roughly 451–503 actual transparent main-pass
draw calls per frame in fixed-seed Quick Play. A leading unnamed family
accounted for ~27,000 observed transparent draws per 90-frame sample.
This is too large and heterogeneous to merge without investigation.

The existing renderer deliberately promotes certain **full-opacity**
exterior façades into its transparent draw queue at renderOrder 1001,
after ground fog, while genuinely cutaway wall surfaces fade with alpha.
Roof slabs, weather/patina overlays, glazing, and promoted facade trim
have separate draw and concealment contracts.

E6.19.A adds *only* observational, opt-in classifications:
- Stable family names for wall bodies/skirting/caps, wall/room patina,
  independent wear, windows, roof slabs, promoted facade details.
- When coldBench=1, per-wall actual transparency reason:
  `camera-cutaway`, `known-facade-foreground`, or `opaque`.
- Per real non-shadow renderBufferDirect draw, collect semantic reason
  + family + material type + full-opacity vs blended + depth-write.
- Top 24 families per frame pooled across the bounded 90-live-frame
  export. These are lower-bound samples; the full transparentDraws count
  and E6.17 reconciliation remain authoritative.

No changes to visual materials, cutaway opacity, render order, shader,
geometry, fog/LOS, known-state ownership, shadow map, fixed-tick
simulation, operator rigs, or actual draw count.

## Gate
Focused tests for provenance/cause separation, lifecycle and prior
E6.16–E6.18 behavior; production build; four real browser runs
(seed 23/97 × briefing idle ON/OFF) measuring 90 actual executing
frames each. Assert semantic wall provenance observed, no runtime JS
errors, expected shadow/main reconciliation and prior provenance.
No iOS FPS or GPU claims: the observer adds CPU overhead.

## Next stage after evidence
Prioritize genuine redundant *translucent* render submissions only
when their visibility, depth semantics, sorting, and object ownership
can be proven equivalent. Do not merge unrelated weather layers,
cutaway geometry or transparent window panels based on material alone.
