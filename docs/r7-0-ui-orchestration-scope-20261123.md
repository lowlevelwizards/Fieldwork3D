# R7.0 — UI orchestration, equipment workspace and presentation-state audit

**Base:** `e73221724fdf4f73cfbd971a50cad8c1e63506d8` (R6.4 merged and public Pages verified 2026-11-23).
**Branch:** `refactor/r7-0-ui-orchestration-audit-20261123`.
**Stage:** evidence-only, fail-closed ownership census; no runtime, CSS, schema, gameplay, animation, fog or replay change.

## Why R7, and what R7.0 must prove

The earlier E0 audit identified UI refresh and repeated presentation work as review candidates, not demonstrated bugs or FPS gains. R6.4 has closed the action architecture series. R7 focuses on the user-facing boundary between session/campaign changes and the different UI consumers. The main hotspots are **application orchestration** (`src/breach-main.ts`), **the tactical HUD** (`src/ui/tactical-hud-controller.ts`), **campaign menus/armory** (`src/campaign-ui.ts`), **Quick Play operations and preparation** (`src/breach-operations-board-controller.ts`, `src/ui/quick-play-configurator.ts`), and **runtime refresh scheduling** (`src/breach-runtime-loop.ts`). File size or repeated helper names alone never justify refactoring.

R7.0 **does not** begin the R7.1 runtime separation. Its deliverables are a reproducible source-located report, a frozen owner/state/lifecycle matrix, an evidence-backed R7.1–R7.5 handoff, tests, and existing-CI integration. Reuse C0's 19 scene/presentation owners and E0's overall inventory; do not build a new import graph, renderer, gameplay store, second UI scheduler, or authority.

## Complete work packages

1. **R7.0.01 — Freeze reference and provenance.** Record base SHA and exact inspected SHA (or clearly mark a source archive), the files in scope, LOC/bytes and read-only status. Generate bounded JSON and Markdown artifacts under `artifacts/refactor-r7-0/` (never track changing reports in source).
2. **R7.0.02 — Explicit owner ledger.** Inventory application composition, lifecycle/recorder, frame timer, tactical HUD, context palette and notice feed, mission screens, campaign screen/flow/state, operations board, Quick Play creator, shared outfitter gallery, preview renderer, and existing DOM reconciliation. Record whether each writes gameplay/campaign state, ephemeral UI state, DOM, GL resources, or recording. **One authoritative owner per domain**; a consumer does not become an owner simply by calling it.
3. **R7.0.03 — Source-located refresh graph.** Extract real AST call expressions (not comments, quoted strings, or raw regex counts) for `updateHud`, `refreshHud`, `renderSession`, `renderQuickStates`, `renderOperationsBoard`, `renderSquadPrep`, `capturePlanning`, `recordCompletedOperation`, plus explicit release/replace/DOM methods. Record caller, file and line. Distinguish scheduled 120 ms planning / 180 ms live / 750 ms terminal HUD refresh from immediate event-triggered calls; do not equate source callsites with executions per second.
4. **R7.0.04 — State vs presentation crossing.** Identify bookkeeping currently reached through `updateHud()` (planning recorder and campaign operation closeout), command authority that remains inside session/campaign code, and the read-only HUD/quick-state contract. Propose R7.1 extraction order and invariants, not a new state container.
5. **R7.0.05 — Equipment cross-surface parity.** Trace the Campaign armory, Quick Play operations board, and Quick Play squad preparation, including shared gallery, squad rail, field gadget editor, `CampaignKitPreview`, weapon workbench, stock/issued/equipped differences, navigation/selection and undo. Classify genuine overlap, intentional divergence and mode-specific authority. Never conflate purchased Campaign stock with Quick Play free choices.
6. **R7.0.06 — UI/preview lifecycle.** Source-locate gallery, preview, workbench, observer, async thumbnail generation and disposal/retirement. Separate observed generation guards from unproved leaks. Flag required acceptance around switching operator, opening/closing menus, renderer recreation, portrait/landscape, and interrupted GPU thumbnail reads.
7. **R7.0.07 — Interaction continuity.** Inventory keyboard focus, sheet/back navigation, scroll restoration, current squad selection, WATCH/waypoint/targeting, hidden stale actions and replay/mission reset. Capture existing guard modules; no new UX behavior in this stage.
8. **R7.0.08 — R7.1–R7.5 prioritized handoff.** Assign ownership, functional acceptance, measurable before/after metrics, rollback and release checklists to each subsequent stage. Separate low-risk component split from higher-risk lifecycle and rendering changes.
9. **R7.0.09 — Regression/CI closeout.** Test AST observer on synthetic input (including deceptive comments/strings and member calls), owner contracts and missing owner failure, materialized Markdown/JSON evidence, exact source-matched boundary symbols, read-only claims. Run the audit under the existing architecture workflow; upload evidence there, not in a new workflow.

## Existing architecture to retain

| Domain | Canonical current owner / consumer | Do not change in R7.0 |
|---|---|---|
| Fixed 60-Hz Session + GO | `breach-game.ts`, `breach-runtime-loop.ts`, existing executor/motor | No simulation tick, order, collision, routing or visibility mutation |
| Recorder/replay history | `breach-replay.ts`, `breach-main.ts`, replay controllers | No missed planning snapshots, record reordering, seek or knowledge changes |
| Tactical HUD display | `ui/tactical-hud-controller.ts` | No second command author, historical notice leakage, changed selection, WATCH behavior |
| Campaign authority/serialization | `campaign-state.ts`, `breach-campaign-flow.ts` | Never transact purchases or change saves from renderers |
| Campaign presentation | `campaign-ui.ts` | Current tabs, squad assignment, supply, contract selection, equipment and scroll continuity |
| Quick Play equipment presentation | `breach-operations-board-controller.ts`, `ui/quick-play-configurator.ts` | No stock/purchase conflation or pre-GO soft locks |
| Shared equipment components | `ui/campaign-outfitter-gallery.ts`, `ui/loadout-squad-rail.ts`, `ui/field-gadget-editor.ts`, `equipment-preview.ts` | Keep shared drawing/preview and async generation cancellation; no parallel component family |
| Existing presentation audit | `scripts/verification/package-c0-presentation-audit.mjs` | Reuse C0 owner/mode matrix and its verification rather than rewriting it |

## Known findings to resolve with evidence

- `updateHud()` (currently near line 770 of `src/breach-main.ts`) calls both `recorder.capturePlanning(state)` and `recordCompletedOperation()`, then coordinates deployment, mission screens, replay library, quick states, tactical HUD and context. The main R7.1 candidate is separating authoritative bookkeeping from refresh; it **must not** lose required event timing on mission completion.
- `src/breach-runtime-loop.ts` currently schedules HUD at 120/180/750 ms depending on phase, while input events request immediate updates. The read-only audit must mark both sources; not simply remove a call for being repeated.
- Campaign home/armory replace their root subtree on navigation, while the Quick Play operations board and squad preparer independently rerender their own sections. A selective-diff approach could help, but baseline browser DOM writes and input latency **remain unmeasured** in R7.0.
- `createOutfitterGallery()` already serializes thumbnail production, carries generation tokens and retires `IntersectionObserver`/RAF jobs on dispose. It would be wrong to call that feature missing or duplicate its scheduling.
- `CampaignKitPreview` owns a GPU context and thumbnail caches. Different mounted views may intentionally need different lifetime policies. Do not assume a leak or duplicate ownership without a real lifetime measurement.

## Required evidence and output contract

`node --test tests/r7-0-ui-orchestration-audit.test.mjs`

`node scripts/verification/r7-0-ui-orchestration-audit.mjs --check --out artifacts/refactor-r7-0`

The report includes `audit.json`, `ownership.json`, `refresh.json`, `equipment.json`, `lifecycle.json` and `handoff.md`. The source observer reports bounded sites with file, line, enclosing function/callback and call target, plus total counts. Static evidence is **not** browser event frequency, DOM commit count, input latency, GC, GPU cost or gameplay outcome. Missing required owners and entrypoint symbols fail closed. Numbers may change with future implementation; tests validate semantic presence rather than snapshotting incidental call counts.

## Acceptance plan for follow-up phases (not R7.0 claims)

- **R7.1**: Separate recorder/completion actions from read-only `updateHud`; assert exact 60-Hz GO, single operation receipt, no lost planning snapshots, restart/replay parity.
- **R7.2**: Profile/limit actual DOM mutations and renders with event-vs-timer provenance; assert immediate actionable commands, WATCH/waypoint selections, selected dots and terminal/no-stale notices; show measured input/DOM reduction before shipping.
- **R7.3**: Share equipment workspace *orchestration* only where parity exists; preserve campaign stock/transactions, Quick Play free kit, save/undo and unavailable-state semantics; test orientation/preview lifetime.
- **R7.4**: Extract Campaign screen view controllers without introducing a second CampaignState authority; preserve focus/back navigation, opened sections, armory preview, squad switching and session restoration.
- **R7.5**: Consolidated readiness: replay/mission reset, fog/visibility, 3D/2D, input and mobile layouts, synthetic + real browser acceptance, typecheck/build, exact-head CI, served Pages SHA. Only delete adapters after proving every consumer is migrated.

## Release gate

1. Stage includes only new `docs/`, `scripts/verification/`, `tests/` and edits to the existing architecture workflow for the read-only audit. No production import of the audit.
2. Tests pass against the actual checked-out PR head; preserve prior E0/C0 contracts and broader architecture acceptance. No new workflow and no relaxed thresholds.
3. All required PR gates are green at the **latest** head; recheck current main and earlier Pages run. Merge only then.
4. Verify new main's Pages workflow completed and the public build stamp matches. If the infrastructure blocks verification, leave unmerged or report the exact blocker; never claim live deployment from a green PR alone.

**Scope boundary:** R7.0 documents and verifies review candidates. It is **not** R7.1–R7.5 implementation and claims no UI responsiveness or performance improvement.
