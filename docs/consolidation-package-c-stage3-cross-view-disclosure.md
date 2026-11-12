# Consolidation Package C — C3: Cross-View Presentation Consistency

**Branch:** `refactor/consolidation-c3-cross-view-disclosure`  
**Baseline:** `53147e658515f42acdab7df0109963ccd4bff78c` (C2 main, Pages workflow `43236190439` succeeded, including exact served-build stamp).  
**Owner contracts:** A8 Session geometry, B8 rig-local poses, C1 site lifetimes, C2 render composition, Replay R4.2/R4.3 immutable historical evidence, F1 graphic-lighting profiles.

## Goal

Make Floor Plan 2D, tactical 3D, Director/Replay and Bodycam consume the **same presentation disclosure decisions** for actors and civilians, and ensure personal replay-ground overlays always display the correct recorded evidence after seeks or archive changes.

C3 is presentation-only. It cannot modify simulation LOS, visibility acquisition, civilian generation, replay capture/archive schema, AI, physics, animation, world geometry, lighting, cameras, tactical controls, UI layout, or existing frame order.

## C3.0 — Audit findings

1. `breach-2d-actor-renderer.ts` independently selected actor visibility and civilian sight, while 3D uses `presentActor` and `presentCivilian`. In particular, 2D replay squad civilians with no `replayVisible` flag fell back through `civilianPresentationVisible` to live LOS. The 3D presenter already fails closed if no historical knowledge is present, except when an older recording explicitly supplied `replayVisible:true`. That difference can expose information in 2D which 3D/Bodycam withholds.
2. `breach-2d-world-renderer.ts` filtered enemy weapon-light polygons using `replayActorDisclosed(...,{mode:'squad'})` even when no replay was running. A live Session with no replay-knowledge sample therefore hides the light of an otherwise revealed hostile. 3D visibility uses current sight while live, and archived samples while replaying.
3. `breach-2d-visibility-renderer.ts` cached the observer's historical personal-ground tint by observer ID, **number of keys** and site. `PersonalGroundHistory.at` returns an accumulated Set; rewinds reconstruct Set objects and switching archive/history can change its identity. An equal-size but different observed set was not part of the cache key. Track its identity alongside size; the existing size check still catches in-place Set growth.
4. The existing `ReplayKnowledgeController.disclosure()` already models full/squad/operator policy; the existing `presentActor` and `presentCivilian` already implement 3D and Bodycam semantics. Reuse them directly. No new "universal render controller", no duplicate LOS calculation, no additional archives, no per-frame string hashing.

## Scope and implementation

### C3-A — Align 2D weapon-light disclosure

Use `presentActor(session,actor,omniscient,policy)` on the red actor's light beam. Pass `null` during live play (current Session acquisition) and the actual policy returned by `ReplayKnowledgeController.disclosure()` during playback (historical evidence only). Keep physics blockers, beam polygons, active mode, cache lifetime and lighting brightness unchanged.

### C3-B — Align 2D actor/civilian models with 3D

Use `presentActor` in Floor Plan operator sprite gating and `presentCivilian` for Floor Plan civilians. This ensures:
- Full replay intentionally displays all.
- Squad replay displays models only when archived squad knowledge permits; for legacy civilians, a true per-frame `replayVisible` flag remains compatible.
- Operator/Bodycam replay is strictly limited to that individual's archived sight (old films without evidence fail closed).
- Live mode continues to use current sight/Full View and never requires a replay archive.
- Existing remembered contact markers and scenario overlays retain their rules; they do not promote an unseen model to a visible model.

### C3-C — Fix personal-ground overlay cache identity

Track `groundCacheEvidence:ReadonlySet<string>|null` in the existing replay knowledge owner, reset it on new film, and consider it in `renderReplayPersonalGround` cache invalidation. Maintain the existing size, site and observer checks. Same object and same size means no repaint; different object with same size repaints; mutated object with a larger count repaints.

The renderer still calls `paintReplayPersonalGround`, whose only input is captured fine/micro tile evidence. Do not infer personal knowledge from squad fog or recompute replay LOS.

### C3-D — Verification

Add `tests/package-c3-cross-view-disclosure.test.mjs` to verify live/red models and lighting, replay squad, operator and full visibility, fail-closed replay civilians, legacy `replayVisible` compatibility, synchronized source-owner contracts, and mock-Canvas cache repaints on same-size evidence swaps, Set growth, and replay reset. Preserve existing authoritative replay and fog tests.

### C3-E — Integration

Extend the existing Package C CI workflow with targeted C3 tests and inherited Stage 3 replay/visibility integration, R4.2c civilian sight, and 2D renderer extraction. Keep C0–C2 checks, architecture integration, TypeScript/build, browser tactical/mobile, Replay/Bodycam/Operator Lab and release-readiness checks.

### C3-F — Release checkpoint and C4 handoff

Do **not** merge when Pages is queued or running, or when final-SHA critical checks fail. Verify the preceding production build's public stamp, merge once, and verify the new exact merge SHA is both successfully deployed and served before initiating another release.

**C4 handoff:** tactical HUD, floating palette, 2D/3D overlays and pointer/picking presentation can now rely on one consistent actor/civilian disclosure. Do not expand C4 into AI or renderer changes.

## Risks and explicit exclusions

- Do not treat an intentional Full replay or Full View as a knowledge leak.
- A remembered enemy contact marker is **not** a visible model; preserve marker duration and display policy.
- Do not change door physics or retrospective door/window observations.
- Do not change the replay archive format or recorded snapshot producer.
- Preserve existing 2D draw layer order and 3D shot/camera handling.
- Browser-headless tests cannot certify real iPhone Safari performance, thermals, or visual pixel acceptance.

## Completion ledger

- [x] Starting production SHA and Pages served-build success verified.
- [x] Cross-view owners and three concrete consistency gaps audited.
- [x] A–C changes implemented on feature branch.
- [x] Targeted tests and Package C workflow authored.
- [ ] Final C3 PR checks green, including real WebGL browser smoke.
- [ ] Deployment queue clear, final clean PR and prior Pages served-build confirmed.
- [ ] Merged exact SHA successfully deployed and publicly verified.

The PR conversation is the authoritative closeout record once release checks finish.
