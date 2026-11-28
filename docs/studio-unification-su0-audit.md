# SU0 — Studio unification: source audit, review and migration scope

Date: 2026-11-28. Audited main: `9c9f7af3913a3d104c1862fa068454b16fc15f42` (verified via commit API). Branch: `feat/studio-unification`. Source inspection via pinned GitHub file reads and indexed caller searches. No runtime changes. Local checkout/network and browser execution were unavailable; no measured timing, screenshot, reachability census across every file, or physical-device claim. The scope is complete as a proposed migration contract; runtime baselines and indirect consumers remain explicit SU1 entry gates.

## Executive decision

One Studio shell, two primary workspaces (Operators and Arsenal), inspection available in both; developer diagnostics are opt-in, not a separate operator editor. Retain specialist feature panels rather than forcing every task into a single drawer. Share presentation infrastructure and domain adapters, not Campaign and Quick Play mutation authority. Use current artwork, catalog IDs and gameplay rigs. No new parallel UI framework, duplicate domain state, global GPU pool or gameplay changes. Remove old implementations only after parity and verified routing.

## Source ownership and overlap

All paths relative to this pinned repository. Counts are split-on-newline source counts, not executable LOC. Ten major presentation files total 9,177 lines.

| Owner | Lines | Current responsibility / decision |
| --- | ---: | --- |
| src/operator-studio.ts | 2645 | Independent renderer/camera, appearance, materials/details, historical reference browser, local draft/presets, embedded save messages. Extract controls and draft behavior; retire standalone bootstrap. |
| src/breach-operator-lab.ts | 2663 | Independent renderer/camera/loop, appearance editor, NPC reactions, tracks, kit/pose comparisons, diagnostics. Keep test scenario behavior, migrate as inspection modules. |
| src/equipment-preview.ts | 1048 | CampaignKitPreview renderer, paper doll, focus/orbit, picking, carry highlights, thumbnail render targets, idle, disposal. Preferred starting point for operator viewport lifecycle, not unconditional visual winner. |
| src/arsenal/workbench-screen.ts | 934 | Primary draft, undo/redo, parts, fit/mounts, stock, finishes, stats, load/save/apply, overlay. Retain recipe/draft logic and panels, remove independent overlay ownership. |
| src/operator-appearance-grid.ts | 490 | Studio appearance tiles, contextual availability, thumbnail camera and render scheduling using injected renderer. Retain selection/availability and merge scheduler. |
| src/arsenal/viewport.ts | 366 | Primary weapon perspective preview, orbit, lighting, fit/dispose. Extract weapon scene adapter to shared viewport contract. |
| src/ui/campaign-outfitter-gallery.ts | 288 | Shared gear selection, carry quote display, lazy thumbnails, auto-pack and advanced callbacks. Reuse, de-campaign-name when migrated. |
| src/arsenal/glock-gallery.ts | 274 | Secondary gallery, Glock snapshots, M9 preview/inspector, separate library. Retain catalog behavior, consolidate renderer/chrome. |
| src/arsenal/glock-workbench.ts | 252 | Secondary customization, specs, compatibility, saves; preview-only, no apply contract. Add explicit contextual capability/adapter. |
| src/arsenal/gallery-main.ts | 217 | Primary/secondary tabs, filters, gallery selection, saved actions, thumbnail queue, standalone shell. Preserve catalog and filters; retire bootstrap. |

Additional confirmed owners: src/ui/equipment-workspace.ts (101 lines), src/operator-studio-bridge.ts (207), src/breach-equipment-editor-bridge.ts (90), src/arsenal/thumbnailer.ts (104), src/arsenal/glock-viewport.ts (182), src/arsenal/m9-inspector.ts (84), src/operator-preview-rig-lifecycle.ts (17). Existing reusable UI: src/ui/outfitter-zone-nav.ts, src/ui/outfitter-choice-sources.ts, src/ui/dom-elements.ts, src/arsenal/gallery-chrome.ts, src/arsenal/preview-job-queue.ts. Reuse R7.3 and C0 ownership work (docs/r7-3-equipment-workspace-scope-20261123.md and docs/consolidation-package-c-stage0-presentation-baseline.md).

## Findings (severity is migration risk, not a proven defect)

- Critical: state/authorization. Studio bridge validates source/origin, selected operator, mode/phase, batch appearance and historical proposals; rollbacks on save failure. Equipment bridge guards planning, replay and active campaign contracts, quotes then applies primary weapon recipes. Preserve these behaviors; direct standalone storage writes must not become contextual authority. Revalidate live context at commit, reject stale sessions and duplicate applies.
- High: renderer fragmentation. Seven observed WebGLRenderer construction sites: operator-studio.ts:202, breach-operator-lab.ts:746, equipment-preview.ts:132, arsenal/viewport.ts:85, arsenal/thumbnailer.ts:48, arsenal/glock-gallery.ts:53, arsenal/glock-viewport.ts:56. These are sites, not simultaneous contexts or leaks. M9 inspector shares GlockViewport. Appearance grid uses an injected renderer. Operator Studio/Lab use orthographic cameras; weapons use perspective. Share lifecycle and controls while preserving intentional projection and framing.
- High: three Outfitter hosts already share createEquipmentWorkspace: campaign-ui.ts:135, ui/quick-play-configurator.ts:200, breach-operations-board-controller.ts:55. R7.3 generation guards, per-operator drawer memory, ready preview reattachment, deferred mount cancellation and fallback are migration invariants, not code to replace.
- High: appearance/equipment cross-domain selection. operator-wardrobe-unified.ts maps wardrobe items to equipment slots; equipment-unified-loadout.ts quotes combined physical carry. Preserve canonical fit, carry constraints and appearance/gear consistency. Never duplicate rules in selectors or infer availability from meshes.
- High: primary/secondary disparity. recipes.ts supplies primary ArsenalRecipeV2 legacy conversion; Glock recipe v1 separate, Glock workbench saves preview-only; M9 inspector is art inspection, not evidence of equip capability. Expose capability-based controls, keep unsupported actions disabled with explanation. Do not fabricate gameplay support.
- High: Lab duplication vs real diagnostic value. Lab HTML has 47 authored data-pose controls (verify inventory count at migration); other controls/track sources also exist. Keep movement transitions, ready/action tracks, NPC reactions, frame stepping, retention, camera/game zoom, comparison, pinned references, wardrobe import/export, sample inspection kits, silhouette/group isolate and temporal/contact diagnostics. Not all tracks are simple gameplay enum values. Use registry of gameplay pose adapters plus authored diagnostic scenarios. No parallel pose solver.
- High: save migration. Studio wardrobe-only preset key fieldwork3d.operator-studio-presets.v1 (8 limit); Lab wardrobe looks fieldwork.operator-wardrobe.looks.v1; primary builds fieldwork3d.arsenal-recipes.v1; Glock builds fieldwork3d.arsenal-secondary-recipes.v1 (48 limit). Also Quick cosmetics and Campaign saves via BREACH_STORAGE_KEYS / active campaign key. Preserve old reads, identities, names, stable IDs, values and partial legacy semantics; do not promote looks to complete operator kits silently. Versioned, idempotent migration only after fixtures and recoverable failure behavior; no destructive clearing.
- Medium: multiple thumbnails and lighting paths. Appearance grid, equipment preview, primary thumbnailer, Glock snapshots use separate framing/scheduling and some shared output/lighting. Unify job scheduling, cancellation, keys, cache policy, scene restoration, disposal; keep asset-specific composition. Lighting parity must be captured before changing look.
- Medium: navigation. vite.config.ts declares separate arsenal, operatorStudio, operatorLab, poseWorkbench entries; index.html links Lab from settings. breach-main.ts wires menu/quick/campaign Studio and Arsenal callbacks. Studio embeds iframe with suspend/retain timer, Arsenal opens document overlay, Outfitter lives within modes. Route legacy URLs to equivalent Studio workspace only after deep-link/test/screenshot consumer migration. Preserve browser back and context identity.
- Medium: no measured perf proof. Profile context counts, heap/GPU resource counts where available, cold vs warm open, first image, selection latency, rig rebuild count, frame times, input responsiveness and repeated close/open. Distinguish shared geometry ownership and preview disposable resources; do not dispose gameplay-owned caches.

## Feature parity ledger (required before legacy retirement)

Operators: identity/callsign/color where supported; face/hair/wardrobe, item/material/details, camouflage placement, matching sets, headgear/attachments, armor/rig, footwear/hem, belt/backpack, gloves and other catalog slots; full kit and clothes-only views, show/hide weapon, basic pose, compare, reset, undo, presets, selected operator, camera focus/orbit/front/side/back/fit; historical reference browsing, preview/proxy and transactional apply; loadout options, stock/cost/availability, physical placements, magazines/tools/gadgets, auto-pack and advanced carry board, primary and secondary assignment, actual equipment preview/picking. Use canonical catalogs for exact available options.

Arsenal: primary/secondary categories, factory references and search aliases, saved filters/actions (rename, duplicate, delete, load, overwrite/copy), side-view thumbnails, viewport controls, primary recipe parts/attachments/mount picker/fit/stock position/finish/handling stats, undo/redo and dirty state, context apply quote; Glock model/sights/accessory/finish/specs and separate recipe reads, M9 art-only inspector. Preserve legitimate differences; no universal editor until capability support is validated.

Inspection: same current draft rig by default; optional explicitly labeled test fixture, comparison rigs and NPC/casualty fixtures; playback, speed, frame step, transitions and track settings, camera/zoom, pose fit and contact diagnostics, anatomy/temporal overlays, clipping/attachment inspection, compare and isolate groups, wardrobe look import/export, screenshot/debug automation hooks. Preserve authored tracks and existing gameplay pose contracts. Player gets simple controls; developer gets scenario controls and diagnostics. Pose Workbench stays separate initially (authored pose library/choreography and export are not ordinary inspection).

## Target contracts

1. Studio session: mode, selected operator, source revision, active workspace/category, draft, dirty state, camera preferences, return destination and lifecycle generation. No singleton across mounted modes. Session view state distinct from persistent gameplay data.
2. Context port: read snapshot/capabilities, quote proposal, commit only against current authority, notify host, save/rollback, close/return. Standalone edits presets only unless deliberate existing supported context is entered; quick planning/creator and campaign enforce their current rules. No automatic purchases or use of unavailable equipment.
3. Domain: authoritative createOperatorRig/poseOperator, wardrobe/loadout/carry helpers, weapon catalogs/recipe converters/model factories, existing campaign/quick adapters, pose contracts. UI does not copy any domain decision. Preserve naming/world identity decisions and stable storage identifiers.
4. Preview host: one active interactive canvas per mounted Studio where practical; orthographic operator and perspective weapon scene adapters; shared orbit/fit input, lighting configuration, renderer ownership and lifecycle. Thumbnail work serial/bounded; offscreen context only if profiling warrants it. Comparison scenes may contain several rigs intentionally. Tactical renderer stays independent; suspend only per host policy. Explicit ownership of geometry/material/texture and generation cancellation.
5. UI: common shell, keyboard/touch controls, responsive horizontal category drawer, shared tile/filter/selection state, specialist carry and weapon workbench subpanels. No forced vertical list of all categories, no duplicate labels, no hidden active controls. Developer diagnostics opt-in; use actual draft and independent non-mutating test state.
6. Persistence: readers for legacy looks/presets/recipes, stable versioned typed records (appearance-only vs full kit vs primary/secondary build), explicit save/apply/discard, contextual quote confirmation, recovery on persistence failure. Do not change gameplay save schema gratuitously.

## Complete stage scope and exit gates

| Stage | Deliverable / gate |
| --- | --- |
| SU0 | Pinned source audit, ownership and parity ledger, risks, scope and gates. No runtime mutation. |
| SU1 | Trace transitive callers and static reachability, collect real browser/device baselines, exact feature checklist by route, capture storage fixtures and screenshots; choose owners with evidence; agree context/preview/session contracts. |
| SU2 | Mountable Studio shell and navigation; existing paths still usable; dirty/back/close, selected operator, mode and return destination verified. |
| SU3 | Shared preview lifecycle and scene adapters; preserve rig, projection, lighting and async cancellation; instrument renderer/RAF resources. |
| SU4 | Shared selection/drawer/gallery/thumbnail primitives, visual/touch parity, avoid duplicate render loops. |
| SU5 | Operator session and draft/quote/commit separation, correct mode identity, rollback/discard; preserve source revision. |
| SU6 | Move appearance controls, historical reference workflow and presets reader into unified Operators; appearance parity. |
| SU7 | Move Outfitter gear, paper doll, physical carry, advanced board and gadgets; preserve all availability and packing validation. |
| SU8 | Contextual category/focus/compatibility and linked material/detail controls; preserve appearance/equipment mapping. |
| SU9 | Versioned operator preset lifecycle, legacy reads/import/export and fixture roundtrip; distinguish appearance-only/full kit. |
| SU10 | Unified weapon catalog/chrome, search/aliases, capability filters, saved primary/secondary visibility; no unsupported model claims. |
| SU11 | Port workbench primary and secondary controls, reuse domain draft/recipes, M9 inspect-only when appropriate; preserve mount/fit/stock behavior. |
| SU12 | Operator-to-weapon context roundtrip, primary/secondary capability-gated apply; live quote, save failure and stale-session tests. |
| SU13 | Build library normalization/read migration, roundtrip stable IDs and names, no loss/cross-category conversion. |
| SU14 | Basic player inspection on same operator draft, view/pose/weapon visibility and screenshot. |
| SU15 | Move Lab diagnostics and unique comparison/import/export, NPC and appearance inspection; no lost authored scenario. |
| SU16 | Registry for gameplay pose adapters plus authored diagnostic tracks, generated chooser; validate 47 current HTML track controls and other tracks. |
| SU17 | Advanced time/frame/transition/contact/IK/attachment/multi-actor diagnostics; preserve automation dataset hooks or migrate consumers. |
| SU18 | Route Quick Play board and creator, standalone menu and legacy links to shell; preserve phase restrictions and creator callbacks. |
| SU19 | Campaign integration with existing stock/purchase, historical context, quote/save/rollback and roster continuity. |
| SU20 | Measure performance on same baseline; address rebuilds, GPU/RAF, cached thumbnails, stale work; no unmeasured performance claim. |
| SU21 | Delete superseded bootstrap/bridge/renderer/UI/CSS/obsolete tests only after consumers migrated; keep minimal redirects and compatibility readers. Reuse living audits; no permanent duplicate system. |
| SU22 | Final feature matrix, visual and functional acceptance, build/typecheck, critical tests, release barrier, exact Pages verification. |

Release groups A SU0–4, B SU5–9, C SU10–13, D SU14–17, E SU18–22. Commit staged work on feature branch; merge only compatible checkpoints after previous deploy confirmed. Avoid new CI workflows or unnecessary audits; use existing critical architecture/build, equipment, carry, arsenal, pose and browser checks. Update source-contract tests to behavior/ownership boundaries instead of deleting valid coverage.

## Test / review matrix

- Unit/contract: same domain selection results, compatibility and quote, mode-specific availability, stale context and duplicate commits, rollback and storage failure; legacy schema roundtrip and name/ID preservation.
- Lifecycle: one current preview per host, no stale gallery jobs, suspend/close/reattach, no hidden callbacks, no disposal of shared resources, fallback when WebGL unavailable. Existing tests/r7-3-equipment-workspace.test.mjs, tests/outfitter-gallery-lifecycle.test.mjs, tests/performance-p3-async-thumbnails.test.mjs, tests/performance-p7-gallery-noop.test.mjs.
- Integration: menu, quick board, quick creator, campaign; select operator, clothing, gear, carry, primary/secondary, historical proposal, return from Arsenal, save/discard; active contract/replay restrictions. Existing tests/loadout-quickplay-preview-integration.test.mjs, tests/loadout-quickplay-carry-selector.test.mjs, tests/loadout-carry-selector-integration.test.mjs and scripts/smoke-ux-r1.mjs, scripts/smoke-ux-r3-campaign.mjs.
- Inspection/weapon parity: primary and sidearm galleries, art-only M9, pose track playback and deterministic frame sampling, NPC/compare, screenshot/automation; scripts/verification/ci-operator-loadout-routing.mjs, scripts/smoke-pose-workbench.mjs, tests/consolidation-p11-arsenal-chrome.test.mjs; trace existing targeted tests, don't add broad redundant matrices.
- Visual: same operator and build with identical lighting, view angles, materials, gameplay-distance shot; desktop + small landscape touch; selected white dot, hidden/unavailable semantics, horizontal drawer. Hardware performance and context loss tested separately.
- Release: no runtime changes in SU0. Exact feature head checks before release; verify previous Pages release and exact new build. No deploy requested at SU0.

## Removal and exclusions

Eligible only after parity: standalone Studio/Lab/Arsenal bootstraps and HTML except redirects; iframe protocol once all consumers are migrated; old overlays and duplicate preview/camera/thumbnail paths; duplicate wardrobe editing and static track buttons; dead CSS, stale tests/docs and capture entry assumptions. Keep domain modules, catalog metadata, saved build readers, comparison/diagnostic functionality, campaign and quick transaction ownership, tactical renderer, and test coverage. No unrelated AI/movement, gameplay balance, asset remodels, new weapon support, historical catalog rewrite, other labs or Pose Workbench authoring migration. No automatic main merge. No numeric LOC savings promised before reachability review.

## SU0 review and limitations

Source baseline and key owners/callers verified; source counts and renderer sites measured from retrieved files, not runtime. Scope, parity and migration ordering defined. Audit did not execute app or tests, could not clone locally or obtain exhaustive repository tree with available connector, and does not certify full indirect caller inventory or existing behavior. SU1 must close these evidence gaps before deleting anything. No runtime code touched, no production change. This is an audit-only checkpoint, not implementation acceptance.
