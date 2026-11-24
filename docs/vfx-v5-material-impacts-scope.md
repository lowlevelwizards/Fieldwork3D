# V5 — Material impacts
Stacked on V4 head 126e4db (not independently releasable until V4 and foundation reconcile).

## Scope
- Distinct short sparks (metal), elongated chips (wood), chunky grit (stone), small fragments (glass), diffuse dust (other). No change to collision, projectile results, material classification, recorded events or environment damage.
- Reuse actual shot surface/lifetime and per-particle sight query. Preserve no personal replay disclosure. Deterministic id and recorded age, including seeks and reset. No particles emitted on unrelated events.
- Generalize V4 bounded shared particle batch to per-instance color, opacity and scale, keeping one draw where practical. Maximum 140 nonblood particles (20 shots × 7) plus existing blood capacity; mixed budget must be bounded. Separate atlas/geometry only when visual value warrants it.
- Current standalone sample atom uses existing impact profile counts/lifetimes and shared scratch. Verify material dimensions and lifetimes, finite deterministic samples, no stale counts, no additional draw per chip. Keep ground mark atlas and tracer path unchanged.
- Browser same-scene old/new A/B across mixed material stress and different camera views; verify submission/triangle costs, disclosure/seek/reset, alpha ordering and captures. Avoid performance claims before measured; dust billboards and more persistent glass are later stages.
- Initial prototype is unintegrated and untested. No default change.