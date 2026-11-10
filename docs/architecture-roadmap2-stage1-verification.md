# Roadmap 2 · Stage 1 — deterministic gameplay contract

**Scope: Stage 1 only.** No runtime simulation refactor, no new tick clock, no
animation-side gameplay authority, no World Context migration. The goal is to
build trustworthy regression evidence *before* invasive refactors in Stages 2–12.

Baseline: main after Roadmap 4 Batch C, commit
`6baddf359c214958777c28ac0f5f28d8b2d73e30`.
Stage 1 closure PR: #1188.

## Responsibilities and boundaries

- Authoritative simulation remains `stepSession(s,1/60)` in `breach-game.ts`.
- Real game APIs author commands and perform replay/restart.
- `tests/fixtures/breach-stage1-contract-runner.mjs` owns only deterministic
  setup, scripts, fixed-clock calls, finite-state checks, replay capture,
  canonical state observation, and a SHA-256 outcome fingerprint.
- `withTemporarySiteGeometry` restores any displaced active mission on success
  or failure, including nested use. The legacy seed harness now respects it.
- Snapshot contracts use actor IDs, positions, health, wounds, plans, motion,
  weapons, AI evidence, doors, sight knowledge, civilians, event sequence,
  projectile outcomes, objective state, and terminal phase; not wall-clock
  measurements or renderer object addresses.

## Independent expected outcomes (not mere same-seed equality)

| Case | Protected contract |
|---|---|
| Authored WAIT + MOVE | Undo/redo preserves **serialized** authored commands and WAIT actually completes after GO |
| Head-on passage | Two friendlies start on opposite sides of one leaf; both must complete passage without oscillating door pressure |
| Hinged threshold | Initially closed leaf opens under real motor and concurrent team orders; completed-order count advances |
| Timed reload / wound | Mag inserted, reload timer reaches zero; severity-2 wound advances medical injury/health and reports an event |
| Combat / AI | Open sightlines produce projectiles and guards respond via authoritative perception/decision logic |
| Acoustic evidence | A real sound observation is consumed; no synthetic presentation-only contact |
| Civilian rescue | Precisely one generated target exists as an actor before, during and in replay history |
| Mission lifecycle | A physically reachable clear objective wins; losing all operators reports failure |
| Replay parity | Recording the mission cannot change authoritative outcome; historic frames can rewind |
| Restart | Site, squad kit, positions and mission rules restore to pre-GO snapshot, discarding mutated play state |
| Isolation | A preexisting displaced live site survives scripted runs and injected exceptions |
| Multi-seed | Three generated missions are reproducible without collapsing to the same fingerprint |

**Frozen SHA-256 outcomes**, captured on the pre-refactor engine and asserted
alongside independent behavioral outcomes in the critical suite:

- Hinged entry: `f0300241e8134d1a65c5e71fd22c827447e96128a92bb82c2bd64958c02f895c`
- Reload + wound: `a7b43bd0f015e426050ab1a001ce8bf67daf511a936efa9d3e5ea779de27f0b4`
- Combat + AI: `7d186411687555c809c6aac8caeedd0814008ac92b291cc799a550247ecda349`
- Civilian rescue/replay: `32b97cc3908c2c2655d5729996b6513d57efa339f1ed63b8b82aadf204592136`

**Do not automatically refresh these baselines.** When an engine feature
intentionally changes simulation outcomes, compare recorded states/events,
explain why and approve the exact new baseline in the corresponding PR.

## Execution and closure

Fast critical integration test (also run by unified architecture CI):

```sh
node scripts/verification/breach-critical-suite.mjs
npm run build
```

Dedicated 20-second-per-scenario live + replay soak (opt-in, not a permanent
quick-PR dependency):

```sh
node --experimental-strip-types --test tests/breach-roadmap2-stage1-soak.test.mjs
```

The opt-in soak exercises 1,200 authoritative ticks for the hinged entry and
armed contact sites **twice each**, with recorder capture enabled. It checks
complete nontruncated replay, bounded transient shot/event evidence, finite
state, monotonic clock and matching full-session fingerprints. CPU wall time and
heap measurements, if collected by other scripts, are not assertions of device
performance.

### Stage 1 done means

- [x] Deterministic canonical snapshots and frozen baselines are committed.
- [x] Authored orders, door entry, combat, medical, enemy AI, civilians and
      terminal outcomes each have independent expected-outcome checks.
- [x] Replay and restart are verified against live authoritative state.
- [x] Multi-seed runs and global geometry/error isolation are covered.
- [x] Fast critical subset and separate opt-in soak are available.
- [ ] Latest **full** CI gate green on the final branch SHA.
- [x] Longer soak passed in architecture CI run 42725073607 (91 tests passed, complete 401-frame recordings for both 1,200-tick scenarios).
- [ ] Previous production Pages build verified as served.
- [ ] Stage 1 PR reviewed, merged and deployed only after all above hold.

No other Roadmap 2 stage should be marked complete by this PR.
