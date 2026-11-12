# Consolidation Package C — C0: presentation ownership baseline

**Starting main:** `4e47f2c78b06dd3bf79b1ec5768084efe1530ef1`. Previous Pages workflow `43196081337` completed successfully. A successful deploy job is not alone proof that Pages serves a matching commit; verify the public release at the merge checkpoint.

**Branch:** `refactor/consolidation-c0-scene-baseline`.
**Boundaries:** source-only audit, tests, CI and documentation. No runtime/gameplay, shader, 3D scene, camera, asset, animation, replay, save, fog, generator, campaign, or UI modifications.

## Goal

Complete a reproducible audit of current presentation responsibilities, their overlap and release risks before C1. **Do not** create another renderer/controller tier or infer that large files must be split. A0 already covers repository reachability, A8 covers Session world geometry, A10 covers composition/CI, and B0–B8 cover rig-local authoritative pose output. C0 complements, rather than replaces, those contracts.

## C0 scope and implementation

1. **C0.1 — Baseline freeze.** Pin the previous A/B merge, define non-regression boundaries and independently verify the next release.
2. **C0.2 — Ownership map.** Track 19 present-day domain owners in a machine-readable manifest with role, source SHA-256, and source length.
3. **C0.3 — Hotspot census.** Scan all JS/TS source files for WebGL renderer construction, render targets, disposal, visibility writes, material writes, frame schedulers and ambient globals. These are review signals, **not** proof of a duplicate owner or leak.
4. **C0.4 — Cross-view map.** Identify five contexts: tactical 3D/isometric, tactical 2D Floor Plan, replay/director/bodycam, Operator Studio, Operator Lab.
5. **C0.5 — Verification.** Fail closed on missing owner files or drift in canonical 3D, 2D, common fog, Session geometry and replay coordinator markers. Preserve the inherited critical tests and document manual hardware acceptance.
6. **C0.6 — Handoff.** Prioritize C1 findings without prematurely changing ownership.

## Existing owner map

| Concern | Existing module | Interpretation |
|---|---|---|
| Entry composition | `src/breach-main.ts` | Wires existing 3D, 2D, UI and replay services |
| Live/replay scene | `src/breach-3d.ts` | `TacticalScene3D` rendering, cameras, resource updates and disposal |
| Site construction | `src/rendering/breach-site-scene-builder.ts` | Site architecture and static mesh batching |
| Material lifetime | `src/rendering/site-material-lifetime.ts` | Lifetime of site-owned materials |
| Shadows | `src/rendering/breach-shadow-controller.ts` | Shadow update policy |
| Floor Plan world | `src/breach-2d-world-renderer.ts` | Canvas2D frame/world composition |
| Floor Plan actors | `src/breach-2d-actor-renderer.ts` | 2D actor presentation |
| Floor Plan fog | `src/breach-2d-visibility-renderer.ts` | Fog canvas and personal replay ground |
| Fog invalidation | `src/breach-fog-cache.ts` | Shared 2D/3D fingerprint |
| Fog domain | `src/breach-fog-domain.ts` | Display policy, not tactical LOS authority |
| Physical world | `src/breach-world-context.ts` | Session-owned geometry and spatial queries |
| World adapter | `src/breach-presentation-world-ownership.ts` | Explicit adoption of Session site for legacy presentation |
| World lighting | `src/breach-graphic-world-lighting.ts` | Graphic material treatment |
| Studio lighting | `src/operator-studio-lighting.ts` | Inspection light and shadows |
| Studio preview | `src/operator-studio.ts` | Independent preview WebGL/camera |
| Operator Lab | `src/breach-operator-lab.ts` | Independent experimental preview WebGL/camera |
| Preview lifetime | `src/operator-preview-rig-lifecycle.ts` | Rig release ordering |
| Replay view | `src/breach-replay-presentation-controller.ts` | Replay presentation invalidation |
| Replay camera | `src/breach-replay-camera-controller.ts` | Historical framing/view mode coordination |

Two standalone preview renderers are intentional. A static text match cannot prove a dynamic leak, visual parity, FPS, renderer authority or a memory ownership defect. No code is deleted based solely on an inventory count.

## Invariants and critical coverage

- Preserve A8 Session geometry and explicit legacy compatibility. No second authoritative site index.
- Preserve 60 Hz simulation ordering and gameplay visibility/knowledge boundaries.
- Preserve historical replay disclosure and camera timing independently of live-world knowledge.
- Preserve B8 rig-local output publication, Studio/Lab lifecycle and pose Workbench.
- Preserve different 2D/3D draw paths, while sharing authoritative Session/fog fingerprints.
- Run C0 tests and generate evidence in a dedicated PR workflow; leave the existing architecture/build gate active.
- Retain existing critical tests covering 3D scene memory/frame lifecycle, site materials, Floor Plan extraction/fog, world isolation, replay presentation/camera, and Lab poses.
- Real iPhone Safari, dedicated GPU performance, long-replay stress and visual screenshots remain manual/specialized acceptance gates. Headless CI must not be described as physical-device acceptance.

New artifacts: `scripts/verification/package-c0-presentation-audit.mjs`, `tests/package-c0-presentation-audit.test.mjs`, `.github/workflows/package-c-presentation-baseline.yml` and this document. Repeatable commands:

~~~sh
node --test tests/package-c0-presentation-audit.test.mjs
node scripts/verification/package-c0-presentation-audit.mjs --check \
 --json artifacts/package-c0/audit.json \
 --markdown artifacts/package-c0/audit.md
~~~

Generated JSON includes the baseline, source digests, five-mode mapping, checked canonical boundaries and audit hotspot candidates. The Markdown report is suitable for review. Both omit dynamic timing/physical-device claims.

## Prioritized C1 handoff

1. **Critical:** Trace `TacticalScene3D` WebGL context, render-target, texture/material and scene-parent lifetimes through mission restart, replay and site replacement. First reproduce any suspected leak.
2. **Critical:** Trace `buildSiteWorld` → static batching → `SiteMaterialLifetime` reset/disposal. Do not fix harmless duplicate-looking calls without ownership proof.
3. **High:** Confirm 2D and 3D fog invalidation after new reveals, replay seeking and cross-view switches without forward-looking disclosure.
4. **High:** Audit the boundary between replay historical camera control and current 3D presentation; preserve shot validity and visibility.
5. **Medium:** Verify Studio/Lab preview isolation, release ordering and context-loss behavior, especially mobile.
6. **Medium:** Measure CPU/GPU and seeded visual parity before renderer batching or lighting refactors.
7. **Deferred:** Changing AI, tactical motor, firearm pose, color grading, fog resolution, world generator or faction semantics is out of C0.

## Closeout conditions

- [x] Scope and ownership contract defined without runtime changes.
- [x] Source census, stable evidence format and tests implemented.
- [x] Dedicated narrow CI workflow added; inherited gates retained.
- [ ] C0 PR checks green on final feature head.
- [ ] Pre-merge Pages release barrier clear; no queued/running deploys.
- [ ] If merged, exact merge SHA is deployed and publicly served.

Evidence and any exceptions should be recorded in the PR. Never interpret a successful static audit as proof of visual correctness or hardware performance.
