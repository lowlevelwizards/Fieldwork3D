# SU0 — Studio unification: source audit, review and migration scope

Date: 2026-11-28. Audited main: `9c9f7af3913a3d104c1862fa068454b16fc15f42` (verified via commit API). Branch: `feat/studio-unification`. Source inspection via pinned GitHub file reads and indexed caller searches. No runtime changes. Local checkout/network and browser execution were unavailable; no measured timing, screenshot, reachability census across every file, or physical-device claim. The scope is complete as a proposed migration contract; runtime baselines and indirect consumers remain explicit SU1 entry gates.

## Executive decision

**Design revision:** The implementation contract appended below supersedes initial preservation assumptions; the source audit remains historical evidence.

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


# SU scope revision 1 — implementation contract (2026-11-28)

This section supersedes the earlier proposal's blanket Lab feature parity, Outfitter-as-primary-design assumptions, and stage detail where they conflict. Earlier source evidence remains the SU0 baseline. User direction: Studio is the most fleshed-out system; Outfitter is intuitive and fast but cramped; Lab is overgrown and recreates regular equipment/appearance workflows. Target: Studio depth + Outfitter immediacy + Arsenal specialist tooling + curated Lab diagnostics. No runtime implementation or measured validation in this revision.

## A. Product and interaction contract

- Main menu: one Studio destination with Operators (default) and Arsenal. Contextual entry from Campaign or Quick Play opens the actual selected operator and requested category without passing through a landing page. Preserve stable deep links and explicit return destination. No separate player-facing Lab or Outfitter destination at final cutover.
- Header: back/close, workspace switch, operator selection/callsign/rename where authorized, preset access, compact undo/reset and apply/save controls where meaningful. Use one identity header, no duplicated labels or parallel menus. Dirty indication and explicit discard decision on destructive exit. No save prompt for camera changes.
- Operator viewport is the centerpiece, full remaining height/width, not a preview card. Existing stylized game rig/art; dark consistent gameplay-derived lighting, neutral default orbit, white selection dots, no blue selector. Show weapon toggle, full/clothes-only view, fit/rotate/zoom, front/side/rear, optional basic pose and capture. The viewport expands when the drawer closes. No default debug/lighting lab buttons.
- Category rail: compact icons with accessible labels, group identity/clothing/headgear/armor/footwear and primary/secondary/backpack/belt/carry; actual slots/coverage generated from authoritative catalog. Tap icon or model hotspot to select/focus category; same category toggles drawer closed; don't change equipped state simply by focusing. Preserve selected category and horizontal scroll per operator. Group related subslots rather than adding a rail icon per individual item. No redundant nav at bottom.
- One contextual bottom drawer with horizontally browsable item tiles, selected dot, quantity/availability only when relevant, disabled reason for restricted items. On desktop use available width; on small landscape reserve viewport and compact chrome; on portrait allow compact adaptive arrangement, not whole-page vertical scroll. Drawers may internally scroll for exceptional detail/keyboard/accessibility; no clipping or hiding Apply. Touch targets around 44 CSS px where practical; keyboard, focus restoration, aria-selected/pressed, reduced-motion and WebGL fallback. Responsive behavior to be validated at existing supported phone/desktop viewports.
- Three depths: Items (default quick selection), Materials (colors/camo/fabric/finish where supported), Details (cover, attachments, hem, variants, etc.). Only display nonempty tabs; no placeholder or arbitrary permutation tiles. One click changes draft and previews immediately when allowed; selecting unavailable choice explains why without mutating. Material/detail choices derive from current selected item; invalid dependent parts resolved by existing deterministic rules with visible consequence, no surprise purchases or arbitrary replacement. Selection and focus do not force camera reset.
- Specialized panels replace/expand the same drawer for complex carry and weapon edits; no nested full-screen modal stacks. Physical carry placement, available locations, conflicts and auto-pack remain; remove duplicate buttons (not useful carry behavior). Backpack fit and helmet/footwear constraints remain canonical. Reuse existing equipment workspace lifecycle and catalog choice sources, Studio's detailed item/material/details controls, canonical wardrobe mapping and quote logic. Choose final preview owner by visual/perf evidence, not file size.
- Arsenal: standalone browsing (factory/saved, primary/secondary, search/filters) and contextual entry from operator. Quick equip from weapon drawer without opening workbench; deeper edit opens Arsenal in same session with explicit target weapon slot. Weapon-only preview, then equipped preview on same draft operator. Back restores operator, slot, drawer, orbit/scroll; preserve dirty weapon draft or confirm discard. Save build separately from equip; apply to operator draft then final contextual commit. Unsupported art-only M9 remains inspect-only until existing gameplay support validated. No new weapon implementation as part of SU.
- Historical references: access via preset/reference browser, preserve evidence/era/faction/proxy labels and approximation qualifiers. Preview without mutating; apply only compatible subset via existing proposal validation, summarize substitutions and consequences, explicit confirmation when required; derivative saved as personal preset, not historical evidence.
- Inspection: default simple pose selector (idle, low/high ready, aim and supported locomotion/reload previews), show/hide, camera, capture; no separate character editor. Debug opt-in via overflow/settings; lazy-load diagnostics. Exiting debug restores regular view and stops playback/fixtures. Multi-actor fixture uses copies or NPC fixtures, never changes actual roster/draft. Pose Workbench authoring stays separate.
- Persistence and context: standalone preset edits have explicit save; contextual operator edits use a draft and Apply via existing mode authority, no implicit campaign spending. Quick Play and Creator preserve current phase/roster callbacks; Campaign revalidates current stock, cost, restrictions, identity/status, contract, quote and persistence. Batch all changed operator fields as one logical action where existing domain adapters can support atomicity; if not, design explicit safe subtransactions and rollback in SU5 before claiming atomic apply. Failure leaves draft recoverable, committed state unchanged for failed transaction. Switching operators preserves per-operator draft or prompts before discarding; no silent loss. Preset import and saved weapon build do not bypass restrictions. Explicit Apply vs Save Build vs Save Preset labels; no extra save required for preview-only actions.

## B. Lab retention decision ledger

| Feature | Disposition | Migration rule |
| --- | --- | --- |
| Independent wardrobe, cosmetics, material/camo, equipment, weapon selector | DELETE duplicate | Existing Operators/Arsenal catalog paths supply actual draft. |
| Outfit/kit presets, save/load/import/export | MERGE | Preserve valid existing look data and partial semantics via typed preset readers. |
| Camera, focus, zoom, view selection | MERGE | One viewport controller with scene-specific framing. |
| Basic pose, playback, show/hide weapon, capture | PLAYER | Small contextual controls, no separate screen. |
| Ready, reload, movement, transitions, retention, wounded, interaction tracks | DEBUG / subset PLAYER | Registry entries mapped to gameplay pose adapters or explicit authored scenario; preserve useful regression cases; collapse aliases and redundant variants. |
| Frame step, time scrub, speed, loop/reset | DEBUG | Deterministic playback; no background loop while hidden. |
| Contact, anatomy, IK, temporal monitors | DEBUG | Retain diagnostic outputs used in animation acceptance; no duplicate solver. |
| Silhouette, wireframe where supported, isolate group, attachment anchors, equipment inspection and geometry stats | DEBUG | Shared viewport overlay; use existing inspection helpers. |
| Pinned look/kit comparisons and sample kit | MERGE/DEBUG | Shared A/B comparison and explicit fixture; retire duplicate wardrobe/kit UIs. |
| NPC reactions, paired/interaction test cases | DEBUG | Small curated fixture registry, use same gameplay pose source and copies. |
| Lighting comparison, experimental shaders and rendering controls | REVIEW/DELETE | Keep only still-used parity/diagnostic capabilities; canonical lighting remains default. |
| Old one-off experiments and obsolete test scenes | REVIEW/DELETE | Trace callers, replacement and ongoing regression need; document removal reason in living ledger. |
| Pose Workbench authoring and export | OUT OF SCOPE | Keep separate, preserve authored data and transfer APIs. |

Each Lab track/control must receive a KEEP/MERGE/DEBUG/DELETE/DEFER decision with concrete source path, consumer/test and reason before retirement. The 47 HTML pose controls are an initial census, not a mandatory 47 distinct user-facing controls or full track count. Do not remove test fixtures that still uniquely catch regressions; retain them without duplicated player UI. Keep a single ledger in this living report or existing verification inventory, not one document per stage.

## C. Implementation architecture and ownership

Prefer small mountable modules under a coherent Studio namespace, reuse current TypeScript/DOM/CSS patterns and existing helpers. Names below are roles, not mandatory new files. Avoid one mega-controller or duplicate abstractions.

- Shell/router: mount/unmount, workspace, context, return route, focus and dirty-close coordination. No domain mutation.
- Studio session: typed mode/context ID and source revision, current/selected operator IDs, per-operator draft and dirty tracking, selection/scroll/camera preferences, child weapon draft, generation token; snapshot clone/read-only inputs; dispose on final close. Undo/redo commands use domain proposals and do not mutate committed state. Do not serialize UI state into campaign save.
- Context port: read current authorized snapshot; quote typed changes; validate latest state/identity and apply/rollback using existing campaign/roster authority; report reason/confirmation/commit result; mode-specific capabilities. Async results guarded by session generation and revision. Standalone owns preset data only unless explicitly routed to existing authorized context.
- Domain adapters: use operator-wardrobe-unified, equipment-unified-loadout, physical carry board, catalogs, weapon recipes/assembly/fit, existing primary and secondary capability validation, historical proposals and gameplay pose contracts. No duplicated compatibility tables; do not infer equipment capability from model appearance. Keep stable IDs/aliases and existing save schema by default.
- Preview host: one active interactive renderer per mounted Studio where feasible, operator orthographic and weapon perspective scene adapters, shared orbit/focus/fit/resize/render scheduling, lighting/output configuration, explicit lifecycle and fallback. Allow temporary comparison rigs in one scene; tactical renderer remains separately owned. Shared resource cache reference ownership; dispose preview-owned geometry/material/targets, never gameplay-owned pools. Hidden/suspended scenes stop RAF and GPU jobs. Thumbnail service serializes/bounds jobs, keys by canonical asset/material/variant/framing/lighting version, cancels stale work, limits memory, restores render state; extra context only when measurements justify it. Retain appearance and weapon framing styles.
- Gallery and drawer primitives: shared tile, filter, selected/unavailable semantics, lazy visible thumbnails, contextual action, consistent CSS tokens. Existing R7.3 generation guards, per-operator memory and ready-preview reattach preserved. Reuse one UI component family across all modes. Use existing UI and asset tools; no new dependency unless demonstrably needed.
- Presets: typed appearance-only, operator kit, weapon build (primary/secondary discriminated recipes) with stable names/IDs and versioned readers for current storage keys; preserve old look semantics and unknown/unsupported fields where needed. Idempotent migration, recoverable storage failure, old data not destructively cleared; fixture roundtrips, no automatic arbitrary conversion. Existing storage quotas/limits reviewed rather than silently reduced.
- Debug: registry of supported gameplay pose adapters and authored scenarios; optional diagnostic overlays; explicit fixture factory, separate nonpersistent fixture state, test automation hooks preserved or migrated. No custom second operator loadout editor. Debug should be absent from ordinary navigation, lazy-loaded and stopped when not in use.

## D. Staged implementation plan and acceptance

Every stage has a source commit and a narrow validation gate; compatible stages batch into releases, not a deployment per commit. Where a change is not safe to ship alone, retain existing production route/feature switch until dependent stages pass. Do not create permanent dual paths. Establish a tested rollback path before cutover.

| Stage | Work | Exit evidence |
| --- | --- | --- |
| SU0 revision | Adopt this design and retention/removal policy, preserve source findings. | Verified living scope commit; no runtime change. |
| SU1.1 | Reconcile current main/feature branch and outstanding overlapping work; inventory all entry URLs, callers, imports, DOM hooks, smoke/capture scripts, tests and saved keys. Audit Lab controls individually. | Reachability + ownership ledger, exact Lab dispositions and migration risks. |
| SU1.2 | Run actual baseline: screenshots of each workflow at desktop/small landscape/portrait; collect cold/warm open, switch latency, contexts, RAF, rebuilds, thumbnail jobs, heap where available. Capture legacy storage fixtures and mode transactions. | Reproducible baseline or explicitly blocked metrics; no performance claims without evidence. |
| SU1.3 | Finalize session/port/preview contracts, UI layout and route migration strategy against real code, transaction atomicity decision. | Approved architecture boundary, baseline criteria, implementation sequence; no speculative giant refactor. |
| SU2 | Implement mountable shell, Operators/Arsenal navigation, context-preserving routes, return and dirty-close lifecycle. Initially behind migration path. | Route smoke, back/close/focus, mode identity, draft ownership and no leaked mounts. |
| SU3.1 | Extract shared viewport lifecycle from best existing owners; scene adapters, renderer/RAF/resize/controls disposal. | Ready preview reused, projection preserved, hidden loop stopped, stale event rejection, fallback. |
| SU3.2 | Canonical lighting and camera controls; preserve visual framing, show/hide, inspect and comparison hooks. | Same-model screenshot parity, desktop and touch orbit/zoom/focus. |
| SU4 | Shared tile/gallery/drawer/chrome/thumbnail scheduler, cache keys and cancellation; responsive layout and accessibility. | No duplicate category bars, selected/unavailable state, no page scroll in supported landscape, bounded jobs and cache, no hidden work. |
| SU5 | Unified operator draft session and mode context ports, selection and undo/redo, quote/commit/rollback and dirty state. | Unit/contract tests for stale revision, unauthorized mode, save failures, duplicate apply, switch/discard and atomicity decision. |
| SU6.1 | Move Studio identity, wardrobe and item/material/details editors; preserve contextual incompatibilities, set matching, color/camo and preview focus. | Existing supported appearance categories/variants reachable, same canonical outputs, no parallel editor. |
| SU6.2 | Historical reference browser, proxy preview and validated proposal application. | Source provenance, substitution and restrictions preserved; no unauthorized commit. |
| SU7.1 | Move Outfitter paper doll, slot browsing and equipment choice sources into unified operator session. | Fast equip, actual operator identity, quantities and compatibility; shared gallery/preview ownership. |
| SU7.2 | Physical carry, magazines/tools/gadgets, belt/backpack/pouches/holsters, auto-pack and advanced panel. | No overlap, no capacity or inventory bypass; same existing domain validation and packing behavior. |
| SU8 | Contextual category rail, focus, drawer toggle, material/details progressive disclosure, view controls and no duplicated navigation. | Representative helmet, clothing, footwear, armor, backpack, belt flows; no unsupported tabs, focus remains stable; UI captures. |
| SU9 | Appearance/complete operator presets and reference derivatives, save/rename/duplicate/delete/import/export where supported, legacy reads. | Idempotent migration fixtures, old look semantics, failure recovery and context restrictions. |
| SU10 | Unified factory/saved catalog, primary/secondary filters/search/aliases, thumbnail pipeline, explicit model capability metadata. | Catalog counts and stable IDs reconciled, correct labels, art-only models not equip-enabled. |
| SU11.1 | Primary workbench within shell, use current recipe/draft, parts/fit/mounts/stock/finish/stats and undo/redo. | Existing primary workbench critical tests and visual parity. |
| SU11.2 | Secondary editor and inspector into shared shell/viewport; capability-specific controls and no forced parity on unsupported parts. | Glock customization and saved builds preserved, M9 inspection works, no false gameplay capability. |
| SU12 | Quick weapon drawer, child workbench draft, equipped preview, return to same operator, contextual primary/secondary apply where supported. | Roundtrip with preserved operator/slot/scroll/orbit/draft, distinct Save Build vs Apply, stock/phase/availability checks. |
| SU13 | Common build library UI and typed persistence layer with primary/secondary legacy readers. | Stable IDs/names/configurations roundtrip, failure-safe idempotence, no destructive clear. |
| SU14 | Player inspection controls on current operator/weapon, simple poses, capture, show/hide/fit. | No separate rig editor; preview uses actual draft; no game-state mutation. |
| SU15 | Debug tab; migrate only ledger-approved Lab features (compare/isolate/geometry/contact, NPC fixtures, etc.), retire duplicate appearance/equipment controls after equivalent routes. | Decision ledger complete, remaining unique diagnostics reachable, no extra renderer/editor by default. |
| SU16 | Central pose/scenario registry and generated controls; remove duplicate static lists/aliases. | Map existing necessary tracks to shared gameplay adapters, deterministic sample tests, existing pose transfer intact. |
| SU17 | Advanced playback/scrub/frame step, diagnostic overlays, fixture controls and screenshot/test hooks. | Tests for frame/transition/contact output, multi-actor isolation, no fixture mutation or hidden loops; delete obsolete tools only with evidence. |
| SU18 | Standalone main menu, Quick Play board and creator integration; legacy routing compatibility, migrate tests and callers. | Actual shipped route opens correct operator, phase/replay restrictions, no duplicate editor visible, graceful fallback. |
| SU19 | Campaign cutover, existing transaction/quote/inventory/cost/rollback/contract restrictions and historical integration. | Success/failure and stale state tests, actual save reload, unavailable options, stock and costs unchanged by preview. |
| SU20 | Compare baseline metrics; optimize cold/warm open, switch, thumbnails, rig rebuilds, shader/resource churn and hidden RAF. | Report measured median/p95 where possible, no regressions outside agreed tolerances; no invented numbers; real device check if available. |
| SU21 | Remove standalone Lab/Studio/Arsenal bootstrap and old Outfitter paths, iframe/overlay bridges, redundant renderer/UI/CSS/static lists, dead tests/scripts/docs after callers migrate. Keep minimal redirects/readers. | Zero unintended legacy mounts/callers; build passes; existing behavior-based coverage retained; report actual deletions. |
| SU22 | Final feature/retention matrix, UI/accessibility/touch review, real browser functional/perf check, build and critical suite, release reconciliation and exact Pages verify. | No blockers, approved intentional removals, production build matches expected SHA and default routes, rollback available. |

Release A SU1–4 foundations; B SU5–9 Operators; C SU10–13 Arsenal; D SU14–17 inspection; E SU18–22 cutover/cleanup. A–D may stay on the feature branch when partial public UX would be worse. Keep current main deployment barrier: no new main merge while Pages is queued/running; verify previous deploy and expected public build before next; fix failed deployment rather than queueing more. Run focused critical tests and build/typecheck at meaningful checkpoints; reuse existing CI. Reconcile main at release checkpoints; no routine per-stage approval unless a consequential direction tradeoff or blocker. Do not deploy unfinished route as default.

## E. Acceptance scenarios and measurement

1. Open standalone Studio; select operator; change helmet, material and cover; return to full view; undo/reset; save and load appearance preset. Incompatible variants never become selectable.
2. Choose gear quickly: backpack auto-fit, belt placement, footwear hem, pouches, magazine and gadget layout; no overlap; close drawer; no duplicate nav.
3. Change primary/secondary via drawer, customize supported weapon in Arsenal, save build independently, view on same operator, return preserving slot and draft; discard leaves prior state unchanged. Art-only reference never becomes gameplay equipment.
4. Open historical reference; preview proxy/approximation; apply valid proposal or receive reason; save derivative; original reference remains unchanged.
5. Open Quick Play board/creator and Campaign; correct operator/context; disabled unavailable options; quote/confirm where required; successful apply persists exactly once; failed save, stale roster, replay or active contract do not mutate committed state. Return to correct host and selection.
6. Use current draft in normal inspection; enter Debug, scrub reload and movement, isolate mesh, view contact/IK, use NPC fixture, exit; normal draft and camera restored and hidden diagnostics stop. No Lab wardrobe/gear editor exists.
7. Repeat open/close and operator/weapon switch with async thumbnails pending, context loss and unavailable WebGL; no stale callback, hidden RAF, accumulating live renderer or preview-owned resource count. Preserve shared resource pools and usable fallback.
8. Test actual supported desktop and mobile landscape/portrait; no outer scroll in primary landscape flow, visible actions, touch/keyboard navigation, selected dot, contextual tabs, no permanently exposed debug controls. Compare same model/lighting/angle to baseline; no unintended art change.
9. Measure cold/warm open to first usable view, item switch to visible preview, thumbnail time, peak context/RAF count, rig rebuilds, frame timing p50/p95, memory/resource counts across repeated sessions. Set realistic budgets from SU1 baseline; target no regression and meaningful reductions in duplicate work. No arbitrary percentage claims or device claims.
10. Final migration verification: existing save fixtures load, direct URLs resolve to intended route, no unexpected caller of superseded code, no duplicate public entry or legacy active overlay; critical build/tests and exact release verification.

## F. Out of scope / unresolved decisions

No gameplay movement, AI, ballistics, campaign economy, new weapons/gear/art redesign, other labs, Pose Workbench authoring or tactical rendering changes. No new framework, new global store or new per-stage CI workflow. Exact slot grouping, narrow breakpoint layout, final preview implementation owner and whether a specific obscure Lab diagnostic survives must be determined from SU1 evidence. A single shared renderer is a target within a mounted Studio, not a mandate to share it with gameplay or remove necessary thumbnail/fixture resources. SU1 runtime and indirect-caller evidence was not executed here; record blockers rather than claiming acceptance. This revision defines the scope and decisions for implementation but does not start runtime migration.

## SU1 checkpoint — indexed dependency and control inventory

Main and branch verified before this checkpoint: main 9c9f7af3913a3d104c1862fa068454b16fc15f42, feature 06cb61eb62b59afcb7eeebf98b250e55e7ede5d6. Open PRs include overlapping R7.4 Campaign controller and Integration R4 iOS Studio CSS; reconcile at release. Local git ls-remote failed DNS; GitHub connector permits pinned file reads/search/writes but no full checkout/browser. Searches below are capped and not an exhaustive reachability proof. No actual timing or screenshot baseline yet; SU1 remains open until actual browser/full checkout evidence. No production release.

### Indexed callers (default branch)
| Query | Returned | Paths (bounded results) |
| --- | ---: | --- |
| operator-lab.html | 30 | operator-lab.html, vite.config.ts, scripts/smoke-armor-r1-ui.mjs, scripts/smoke-operator-lab.mjs, scripts/capture-belt-artwork.mjs, scripts/capture-unified-carry.mjs, scripts/smoke-sling-retention.mjs, scripts/capture-operator-armhole.mjs, scripts/capture-wa0-operator-context.mjs, scripts/smoke-animation-a2.mjs, scripts/smoke-loadout-l214-inspection.mjs, scripts/smoke-eqa3-16j-npc-lab.mjs, scripts/capture-breach-pose-fit.mjs, scripts/capture-breach-pose-v3-dynamic.mjs, scripts/capture-short-stock-transition-phone.mjs, scripts/smoke-backpack-art.mjs, casualty-transport-lab.html, docs/equipment-00-integration-audit.md, docs/ux00-interface-audit.md, weapon-art-lab.html, src/campaign-ui.ts, index.html, scripts/smoke-operator-lab-unified.mjs, a3-physicality-lab.html, src/arsenal/wa-art-lab.ts, scripts/verification/ci-operator-loadout-routing.mjs, pose-workbench.html, scripts/smoke-wa1-weapon-art-lab.mjs, scripts/verification/package-c0-presentation-audit.mjs, tests/breach-166.test.mjs |
| operator-studio.html | 30 | vite.config.ts, scripts/helmet-h10-ui-smoke.mjs, scripts/helmet-b0-m1-capture.mjs, scripts/capture-operator-d2-masks.mjs, scripts/capture-operator-garment-5.mjs, scripts/smoke-operator-r713-rim.mjs, scripts/smoke-rendering-r718-parity.mjs, scripts/smoke-operator-r715-bleed.mjs, scripts/smoke-operator-r7-shader.mjs, scripts/smoke-operator-lightmap-r5.mjs, scripts/smoke-lightmap-clothes-only.mjs, scripts/pasgt-p5-visual-capture.mjs, scripts/ach-mich-h3-visual-capture.mjs, scripts/helmet-h7-visual-capture.mjs, operator-armor-rig-lab.html, scripts/ach-mich-h4-visual-capture.mjs, scripts/ach-mich-h5-visual-capture.mjs, scripts/ach-mich-h6-visual-capture.mjs, src/reference-planning.ts, scripts/smoke-backpack-art.mjs, scripts/helmet-h9-visual-capture.mjs, scripts/smoke-operator-studio.mjs, src/operator-studio-bridge.ts, scripts/verification/ci-operator-loadout-routing.mjs, scripts/verification/package-c0-presentation-audit.mjs, tests/operator-studio-stage5.test.mjs, tests/operator-studio-main-menu.test.mjs, tests/release-a-studio-resource-lifetime.test.mjs, tests/ux-r2-studio-flow.test.mjs, tests/rendering-shadow-map-512-budget.test.mjs |
| arsenal.html | 13 | vite.config.ts, scripts/smoke-fnc-arsenal.mjs, scripts/smoke-arsenal-navigation-e1.mjs, scripts/verification/e6-26-arsenal-browser.mjs, scripts/smoke-arsenal-lighting-r714.mjs, scripts/smoke-fal-p1-visual.mjs, scripts/smoke-consolidation-p9-arsenal.mjs, src/campaign-ui.ts, scripts/verification/e6-27-arsenal-part-browser.mjs, scripts/smoke-operator-lab-unified.mjs, tests/arsenal-v2-gallery.test.mjs, tests/arsenal-r14-mobile-style-isolation.test.mjs, tests/ci-regression-plan.test.mjs |
| createEquipmentWorkspace | 6 | src/ui/equipment-workspace.ts, src/campaign-ui.ts, src/ui/quick-play-configurator.ts, src/breach-operations-board-controller.ts, scripts/verification/r7-0-ui-orchestration-audit.mjs, tests/r7-3-equipment-workspace.test.mjs |
| fw-studio- | 6 | src/operator-studio-bridge.ts, src/operator-studio.ts, tests/operator-studio-stage5.test.mjs, tests/operator-studio-save-all-stage511.test.mjs, tests/faction-reference-loadout-ft1-3.test.mjs, tests/rendering-r7-light-lab.test.mjs |
| openArsenalWorkbench | 6 | src/arsenal/workbench-screen.ts, src/arsenal-m27-smoke.ts, src/arsenal-m28-apply-smoke.ts, src/breach-equipment-editor-bridge.ts, src/arsenal/gallery-main.ts, tests/consolidation-p11-arsenal-chrome.test.mjs |
| openGlockWorkbench | 3 | src/arsenal/glock-workbench.ts, src/arsenal/glock-gallery.ts, tests/consolidation-p11-arsenal-chrome.test.mjs |
| poseFit | 13 | scripts/capture-breach-pose-fit.mjs, scripts/smoke-operator-lab-unified.mjs, scripts/capture-breach-pose-v3-dynamic.mjs, scripts/capture-short-stock-transition-phone.mjs, src/breach-operator-lab.ts, operator-lab.html, scripts/smoke-sling-retention.mjs, scripts/capture-operator-armhole.mjs, scripts/capture-wa0-operator-context.mjs, scripts/smoke-backpack-art.mjs, scripts/smoke-animation-a2.mjs, tests/operator-lab-unified-poses.test.mjs, tests/arsenal-r10-operator-lab.test.mjs |

### Explicit Lab HTML controls (provisional disposition)
Every ID found on button/select/input by static HTML scan; generated and non-ID controls require separate review. A disposition retires the duplicate UI, not its underlying behavior. Validate exact consumer and existing regression coverage before deleting.

| ID | Destination | Source |
| --- | --- | --- |
| operator | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| weapon | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| injury | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| poseWeapon | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| poseSavedWeapon | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| poseArmor | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| poseRig | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| poseUniform | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| posePack | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| poseAnimation | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| poseFrameBack | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| poseFrameNext | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionSling | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionMode | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionWeight | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionCycle | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionRate | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionMotion | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionHeld | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionSettled | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionSockets | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| retentionRoute | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| poseStrictContact | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| npcLabTrack | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| npcFrameBack | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| npcFrameNext | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| playPause | MERGE viewport / player | operator-lab.html / src/breach-operator-lab.ts |
| timeline | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| unequipAll | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeUndo | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| focusSelected | MERGE viewport / player | operator-lab.html / src/breach-operator-lab.ts |
| hideSelected | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| showAll | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| pinLook | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| comparePinned | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| bduComparisonPrint | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| acuComparisonPrint | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| compareBlouses | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| faceTreatment | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| kitMagazines | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| kitIsolation | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| inspectionSampleKit | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| inspectionClear | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| inspectionItem | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| inspectionLocation | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| inspectionIndex | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| inspectionPose | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeRecipe | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeApply | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| outfitName | MERGE presets | operator-lab.html / src/breach-operator-lab.ts |
| outfitSave | MERGE presets | operator-lab.html / src/breach-operator-lab.ts |
| outfitSelect | MERGE presets | operator-lab.html / src/breach-operator-lab.ts |
| outfitLoad | MERGE presets | operator-lab.html / src/breach-operator-lab.ts |
| outfitExport | MERGE presets | operator-lab.html / src/breach-operator-lab.ts |
| outfitImport | MERGE presets | operator-lab.html / src/breach-operator-lab.ts |
| camoTerrainFilter | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| camoStyleFilter | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| camoOriginFilter | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| camoSearchFilter | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| camoCompatibleFilter | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| camoFavoriteFilter | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| headwearCamoReroll | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| attachmentPreview | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| attachmentPreviewVariant | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| attachmentPreviewContents | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| unifiedCarryVisual | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| unifiedCarryShells | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| unifiedCarryClearance | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeMagazineOrder | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeGloveState | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeGloveColor | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeTopColorway | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeSleeveState | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeTrouserHem | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| wardrobeReset | MERGE Operators | operator-lab.html / src/breach-operator-lab.ts |
| compareKit | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| gaitReference | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| stepFrame | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| restartTrack | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| loopTrack | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| slowMotion | DEBUG playback / contact | operator-lab.html / src/breach-operator-lab.ts |
| compareGaits | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| comparePose | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| silhouetteMode | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| resetCamera | MERGE viewport / player | operator-lab.html / src/breach-operator-lab.ts |
| savePoseView | MERGE viewport / player | operator-lab.html / src/breach-operator-lab.ts |
| diagnostics | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |
| diagnosticLayer | DEBUG fixture / geometry | operator-lab.html / src/breach-operator-lab.ts |

### Explicit pose tracks (47)
| Track | Destination |
| --- | --- |
| idle | PLAYER + DEBUG |
| walk | PLAYER + DEBUG |
| run | PLAYER + DEBUG |
| accelerate | DEBUG scenario; review aliases before removal |
| stop | DEBUG scenario; review aliases before removal |
| restart | DEBUG scenario; review aliases before removal |
| back | DEBUG scenario; review aliases before removal |
| strafe-left | DEBUG scenario; review aliases before removal |
| strafe-right | DEBUG scenario; review aliases before removal |
| strafe | DEBUG scenario; review aliases before removal |
| strafe-stop | DEBUG scenario; review aliases before removal |
| strafe-reverse | DEBUG scenario; review aliases before removal |
| mixed | DEBUG scenario; review aliases before removal |
| turn-90 | DEBUG scenario; review aliases before removal |
| turn-180 | DEBUG scenario; review aliases before removal |
| turn | DEBUG scenario; review aliases before removal |
| pivot-reverse | DEBUG scenario; review aliases before removal |
| pie | DEBUG scenario; review aliases before removal |
| look | DEBUG scenario; review aliases before removal |
| crouch-walk | PLAYER + DEBUG |
| crouch | DEBUG scenario; review aliases before removal |
| wounded | DEBUG scenario; review aliases before removal |
| aim | PLAYER + DEBUG |
| high-ready | PLAYER + DEBUG |
| low-ready | PLAYER + DEBUG |
| ready | DEBUG scenario; review aliases before removal |
| short-stock | DEBUG scenario; review aliases before removal |
| active-aim | DEBUG scenario; review aliases before removal |
| point-shoot | DEBUG scenario; review aliases before removal |
| ready-to-ads | DEBUG scenario; review aliases before removal |
| ads-to-low | DEBUG scenario; review aliases before removal |
| reload | PLAYER + DEBUG |
| reload-emergency | DEBUG scenario; review aliases before removal |
| reload-retention | DEBUG scenario; review aliases before removal |
| reload-shotgun | DEBUG scenario; review aliases before removal |
| reload-interrupt | DEBUG scenario; review aliases before removal |
| reload-wounded | DEBUG scenario; review aliases before removal |
| flash | DEBUG scenario; review aliases before removal |
| door | DEBUG scenario; review aliases before removal |
| kick | DEBUG scenario; review aliases before removal |
| bash | DEBUG scenario; review aliases before removal |
| down | DEBUG scenario; review aliases before removal |
| down-forward | DEBUG scenario; review aliases before removal |
| down-back | DEBUG scenario; review aliases before removal |
| down-left | DEBUG scenario; review aliases before removal |
| down-right | DEBUG scenario; review aliases before removal |
| down-slump | DEBUG scenario; review aliases before removal |

Additional authored track owners: src/breach-lab-tracks.ts, src/operator-lab-pose-browser.ts, src/operator-lab-npc-poses.ts, src/operator-lab-pistol-tracks.ts, src/operator-lab-contact-tracks.ts. Keep their gameplay pose adapters; do not generate a second pose solver. Lab URL flags and dataset hooks are external compatibility surfaces until migrated.

### Architecture checkpoint
Start with isolated mountable shell/router and injected workspace adapters. No new persistent store, no iframe replacement or default navigation change until context ports and real browser checks. Preserve R7.3 lifecycle, existing transaction boundaries and published storage keys (BREACH_STORAGE_KEYS plus Studio/Lab/Arsenal keys in SU0). SU2 can be developed in parallel as a non-production, dependency-free foundation; no release or claim of SU1 completion. Browser baseline, actual transaction fixtures, exhaustive consumers, and exact per-diagnostic test mapping still required before any destructive migration.

### SU2 checkpoint — mountable shell and direct contextual entry

SU2.2–2.3 implement src/studio/shell.ts and extend navigation.ts with an optional typed entry. One mounted workspace per host, update in place within workspace, retire on workspace transition, guard retired workspace callbacks, explicit host-controlled leave/close validation, initial category or weapon slot, preserved return category, error/retry and focus restore. Workspace mounts must clean partially allocated resources if throwing; the shell owns only DOM and returned disposable views. No gameplay authority, iframe replacement, renderer allocation, production route, default menu, or actual editor migration yet. SU2 is still partial; browser acceptance and real workspace adapters remain pending.

Critical isolated verification: Node v22.16.0 --experimental-strip-types --test tests/studio-navigation.test.mjs tests/studio-shell.test.mjs: 9 passed, 0 failed. TypeScript 5.8.3 strict isolated check of both modules passed. Local copies matched Git blob SHA for both modules and both tests. Instrumented DOM port is not a real browser check. Full checkout failed DNS and headless Chromium timed out; no full build, integration, responsive screenshots or physical-device claim. Main remained at 9c9f7af; no merge/deploy requested or attempted. Next: real workspace adapters and SU1 baseline when access permits; reuse existing preview ownership instead of creating an unconnected second renderer.

### SU2.4 checkpoint — real Outfitter owner mounted in the Studio shell

src/studio/operator-equipment.ts binds the existing R7.3 equipment workspace, real preview/gallery defaults and shared category/focus mapping to the Studio operator route. The factory is session-scoped, has no persistence or domain authority, uses host-supplied operator snapshots, authorized equip/auto-pack/carry callbacks and thumbnail targets. Category selection/toggle preserves ready preview and reuses the gallery; actual kit changes refresh the authorized snapshot; rejected selection is cleared, retired callbacks are rejected by R7.3, and the same operator's orbit/drawer memory survives Arsenal navigation. Missing operator snapshots release resources. No independent renderer or duplicate catalog. Existing public routes untouched; no final appearance, secondary weapon, carry panel, styling or contextual transaction integration yet.

Verification: 12 focused navigation/shell/adapter tests passed locally (including 3 new tests exercising the exact existing equipment-workspace.ts with instrumented preview/gallery and DOM ports). Isolated strict TypeScript check passed against minimal dependency stubs; this is not a full-project typecheck. GitHub DNS checkout still fails, so real Three.js, browser layout, full build and device performance are not verified. Next: extract mountable Arsenal gallery/workbench lifecycle and supply real mode-owned snapshot/transaction ports; avoid permanent parallel editor paths. No merge or deployment.

### SU2.5–2.6 checkpoint — mountable Arsenal galleries and thumbnail suspension

Existing primary gallery in src/arsenal/gallery-main.ts is now a mount function rather than import-time DOM bootstrap. arsenal.html keeps its URL and uses the thin gallery-entry.ts standalone adapter. Existing primary/secondary factory/saved models, filters, aliases, thumbnails and standalone workbench routing remain. Secondary gallery now has idempotent disposal; both gallery owners retire observers, queues, thumbnail renderers, pagehide listeners and DOM on unmount. Embedded gallery suppresses duplicate header, requires explicit workbench/inspector host callbacks (no implicit standalone overlays), and activates the requested primary/secondary category lazily. The Studio Arsenal adapter (src/studio/arsenal.ts) routes category changes through the shell when a weapon slot is selected, guards mismatched slot calls and retired callbacks, and disposes the actual mount on exit. This is gallery integration, not workbench migration, weapon apply, or full renderer unification. Hidden tabs pause pending thumbnail GPU jobs and resume with detached jobs pruned and latest hero priority; canceled frames cannot affect newer schedules. Existing source acceptance checks updated for the mount and entry change. No separate catalogs, no new persistence and no gameplay changes.

Verification this batch: 3/3 new queue tests actually executed with Node 22.16.0; strict isolated tsc 5.8.3 check of preview-job-queue.ts passed; locally tested queue and test blobs match committed SHA 3f7ed932572abb68da2b72ff60a8ab494f96e189 and 7889e0d44e3c340cd74360436daf71e75120e8dd. Full checkout still fails GitHub DNS. The real galleries, adapter, existing source contracts, full-project typecheck/build and browser/WebGL behavior have not been executed this batch; no full SU2/SU3 completion claimed. Main at 9c9f7af at start, no merge/deploy. Next: make workbenches mountable and explicitly disposable, integrate real mode-owned editing context, obtain full build/browser acceptance before release.
