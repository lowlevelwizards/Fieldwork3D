# V6 — glass debris
Stacked on V5 head c1272cc; V0/V1 and historical release gates remain outstanding.

## Scope
- Existing 96-instance glass shard mesh and six-fragment 1.05s burst remain the only pane particle renderer. Existing shot-impact glass particles remain V5-owned; don't spawn duplicate fracture events.
- Add four flattened, deterministic settled fragments per shattered pane after the recorded burst. Lifetime is the mission, bounded by the existing 96 slots, current bursts take first priority, rest uses stable site order. Never add collision, modify aperture, break timing or replay frame.
- Use the recorded shattered flag/time; missing history fails closed. Settled debris is disabled in personal replay until per-pane historical ground disclosure is verified. Live/squad preview checks pane and each fragment sight; omniscient allowed. Original pane visibility and default renderer unchanged.
- Cache exact per-slot transforms to skip unchanged GPU uploads; invalidate on site replacement. Rewind, visibility and slot compaction must refresh matrices. No additional draw/texture for settled shards.
- Verify actual browser same-scene fractured pane, pre-break seek, active flight, resting debris, hidden/personal, saturation, slot rewrite and site reset. Compare render cost and inspect captures. Keep preview off by default; conservative site-order settled priority and flattened tetra art subject to visual review.
- Integration committed behind ?vfxGlass=1 with focused tests; not yet verified.