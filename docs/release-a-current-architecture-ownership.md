# Release A — architecture owners and safe simplification boundaries

Living map of currently authoritative contracts (2026-11-13). Prior historical implementation diaries in `docs/` describe old states and are not production API declarations.

| Responsibility | Current owner | Important invariants |
| --- | --- | --- |
| Fixed-step game and authored orders | `src/breach-game.ts` | One 60-Hz authoritative simulation; renderer never advances intelligence or physics |
| Site geometry, revision, spatial indices | `src/breach-world-context.ts` | Session-scoped; `WALLS`/`COVER` globals are legacy/lab-only compatibility |
| Physical pathing/collision | `src/breach-navigation.ts`, motor | Swept full-body legality; never fake teleports or broad-phase as authority |
| Passage/door entry | `src/breach-passage.ts`, `src/breach-order-door.ts`, `src/breach-door.ts` | GO-time priority, real body threshold, hinge sweep and authored orders |
| Fire, safety and pose | `src/breach-firing-pipeline.ts`, `src/breach-friendly-safety-volume.ts`, `src/breach-fire-urgency.ts` | Real muzzle origin, friendly/civilian veto and observed-target requirement |
| Knowledge and fog | `src/breach-fog-mask.ts`, `src/breach-fog-domain.ts`, `src/rendering/breach-fog-mesh-composition.ts` | Knowledge from simulation only; 2D and 3D share display footprint |
| Frame / GPU resource lifecycle | `src/breach-runtime-loop.ts`, `src/breach-3d.ts`, site and batching presenters | No accumulating per-round scene objects, double-disposals or stale batches |
| Studio save authority | `src/operator-studio-bridge.ts`, `src/operator-studio-batch-save.ts` | Host owns Quick Play/Campaign saves; draft iframe cannot mutate mission on its own |
| Historical evidence and playback | `src/breach-replay.ts`, `src/breach-replay-sharing.ts` | Replay records are immutable historical evidence; no future knowledge |
| Critical PR verification | `scripts/verification/ci-regression-plan.mjs`, `.github/workflows/ci.yml` | Changed source domain + modified test + fail-closed unknown files |
| Single production publisher | `.github/workflows/pages.yml` | Critical test first, build+stamp, one Pages upload, verify public served ID |

## Compatibility and scope decisions

1. **Do not remove global world adapters blindly.** Training fixtures and old lab tests still use `activeSite()`, `WALLS` and `COVER`. Production systems should prefer `sessionWorldGeometry(s)`; a dedicated consumer audit precedes any global removal.
2. **Do not introduce a second passage motor.** Q5 benchmark and Door Lab must construct real Sessions and call the actual `stepSession()`, not a simplified proxy.
3. **Keep both 70-case and mirrored 168-case acceptance.** 70-case historical median/tail threshold is its own baseline; 168 cases must meet physical pass/blocked outcomes. Hardware frame rate is not represented by simulated crossing time.
4. **Do not merge old P9 optimization branches wholesale.** Performance P0–P8 recovery is already main. Profile before selectively adopting any unmerged micro-optimization.
5. **Preserve useful diagnostic labs.** A path called legacy is not automatically dead; only remove it after referencing entry points, historical replay consumers, and CI.
6. **Long-film replay R3 stays separate.** Its bounded chunk reader exists only in an experimental PR; storage migration, quota policy and real-device acceptance are not Release A tasks.
7. **Keep production releases sparse.** Staged commits on feature branches; integrate only after exact-head critical tests, then check previous Pages success and served stamp before initiating a main release.

## Focused verification

- Tactical/door: `node --experimental-strip-types scripts/audit-passage-q5.mjs --extended --strict`
- Release A mirrored door: `node --experimental-strip-types scripts/audit-passage-q5.mjs --release-a --extended --strict`
- Fog/Studio/perf regression: `node --experimental-strip-types --test tests/release-a-fog-mesh-lifecycle.test.mjs tests/release-a-studio-resource-lifetime.test.mjs tests/animation-a3-11-progressive-urgency.test.mjs tests/performance-p6-furniture-batching.test.mjs tests/performance-p8-replay-memory.test.mjs`
- Source-domain CI contract: `node --test tests/ci-regression-plan.test.mjs && node scripts/verification/ci-workflow-contract.mjs`
- Build: `npm run build`

Completion claims require the exact integrated SHA and passing CI run IDs. GitHub Pages success is distinct from manual hardware/WebKit frame-pacing proof.
