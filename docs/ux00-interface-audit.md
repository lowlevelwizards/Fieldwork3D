# UX00 — Fieldwork Interaction and Screen Audit

Status: repository-backed baseline; implementation changes follow in staged PRs. Source reviewed on 2026-11-02.

## Design contract

- Battlefield occupies the maximum available safe-area-correct screen space.
- A command has a single documented meaning; context actions reflect selection and state.
- No presentation-only action is allowed to restart a site, erase fog knowledge, spend resources or mutate a save.
- Do not delete tactical capabilities merely to reduce visible buttons. Relocate into discoverable contextual actions.
- Quick Play is non-persistent across rounds for health and equipment; Campaign owns persistent progression.
- Developer inspectors and labs remain reachable, but not in primary gameplay settings.
- UI updates must not allocate, inspect hidden data, or block the 3D simulation loop.
- Keep touch targets approximately 44px or larger, accessible labels, reduced-motion support, and mobile safe areas.

## Screen / source map

| Surface | Canonical source | Major controls / flows | Audit disposition |
| --- | --- | --- | --- |
| Launch/entry | src/campaign-ui.ts entry() | Continue, New Campaign, Quick Play, Import | Keep entry actions; move Import into Manage Saves; guard destructive New |
| Campaign home | src/campaign-ui.ts home(), src/campaign-style.css | Personnel slots, dossiers, supplies, buy, recruit, contracts, chronicle, export/import | Divide into Overview / Personnel / Contracts / Logistics / Chronicle |
| Campaign armory | src/campaign-ui.ts armory() | kit slots, purchases, service, repair, appearance, presets, attachments | Dedicated visual-first editor, explicit choices, preserve inventory semantics |
| Battlefield | index.html, breach.html, src/breach-main.ts, src/breach-style.css | HUD, squad, GO, order bar, camera, settings, contextual menus | Single active UI contract; reduce simultaneous controls, keep commands |
| Squad Operations | runtime DOM in src/breach-main.ts | quick team, weapon cycle, appearance cycle, resupply, loadout, range | Replace oversized overlay with mobile preparation sheet; explicit choices |
| Mission brief | index.html / breach.html + src/breach-main.ts | brief / return, known intel, objectives | Dossier: objective, extraction, intel, squad readiness |
| Replay/debrief | index.html / breach.html + src/breach-replay.ts | timeline, skip, speed, view, follow, analysis | Primary transport controls and advanced analysis sheet |
| Map Lab | map-lab.html, src/map-lab-main.ts | building, scale, seed, condition, overlays, generation, play | Viewport-first; progress state replaces itself on completion |
| Operator Lab | operator-lab.html, src/breach-operator-lab.ts | kit, look, gait, poses, timeline, camera, diagnostics | Categorized inspector with persistent preview |
| Asset Lab | asset-lab.html, src/asset-lab-main.ts | asset picker, variants, cameras, materials, QA | Common lab workbench controls |
| Physicality Lab | physicality-lab.html, src/physicality-lab-main.ts | scenarios, modes, speed, run, single-step, reset | Common lab workbench controls |

## Battlefield action inventory

| Control | Actual behavior / source | Decision |
| --- | --- | --- |
| ROOK, MOSS, ASH, VALE | selectUnit in breach-main.ts | Keep, preserve distinct accents, display readiness |
| GO / PAUSE | toggling(state), updates HUD | Keep highly prominent, differentiate running vs planning |
| ENGAGE | fire policy from fixed bar / context | Keep visible in operator mode; show chosen rule |
| STAND / CROUCH | posture(state, selected) toggles | Consolidate into a clearly stateful button |
| WALK / RUN | movement pace toggles | Consolidate into a clearly stateful button |
| RELOAD | planReload in planning, reloadNow while running | Keep and clarify planned/immediate state |
| UNDO and REDO | undoPlan / redoPlan | Keep, distinguish from Back One Node |
| BACK -1 | backOne on selected plan | Keep discoverable as route editing, not global navigation |
| CLEAR PLAN | clearPlan(state, selected) immediately | Move into Plan Options and provide undoable flow |
| WAIT | planWait(..., .5) | Primarily waypoint action, maintain accessible global shortcut |
| WEAPON | cycleWeapon in Quick Play | Replace blind cycling with explicit chooser |
| FLASH | flash targeting mode | Keep contextual, afford cancel, show remaining |
| SYNC | planSync | Advanced coordination tools |
| CROUCH (orders) | posture toggle | Consolidate with fixed stance control |
| STOP ON CONTACT | toggleContactRule | Keep as explicit operator rule |
| WEAPON LIGHT | runtime-created in settings | Move near operator controls, only when fitted |
| NEW SITE | reset to variant+1 | Move into New Site flow; confirm if plan exists |
| MAP SIZE | cycles small/medium/large, resets | Pre-deployment site config, not generic settings |
| LIGHTING | changes environment lighting | Site config, preserve state when possible |
| INTEL FLOOR PLAN | cycles INTEL_MODES and resets same seed | **Risk:** currently resets fog knowledge; separate view vs simulation rules |
| ISO / TOP / 2D / FIT | camera and view state | Place in compact View controls; never reset mission |
| SETTINGS | toggles siteSettings | Replace mixed options drawer with coherent settings sections |
| MORE ORDERS | toggles order grid | Become contextual More or compact advanced-orders sheet |
| OPERATIONS | runtime operationsBoardToggle | Move to Quick Play team preparation; no wall of cards above battle |
| HELP | brief guidance toast | Move to help/controls, preserve long-press explanations |
| RESTART | reset Quick Play | Move to mission options and confirm destructive operation |

## Context palette inventory

Source: src/ui/context-actions.ts. Keep existing semantics:
- Door closed: OPEN, KICK, FLASH, HOLD, equipped tools.
- Door open: CLOSE, FLASH.
- Node/ground: LOOK, PIE, FLASH, WAIT, FOCUS, SUPPRESS, fire policy, stance, pace, reload.
- Nearby furniture: PUSH; near window: WINDOW; waypoint: DELETE.
Consolidate redundant fixed/context controls; do not remove their underlying handlers. Context menus must not expose hidden enemy information.

## High-severity inconsistencies

1. The user-facing INTEL mode looks like a display setting but resets the current building and fog discoveries. Moving it to mission configuration is a required semantic fix, not a CSS task.
2. Quick Play WEAPON and NEXT LOOK cycle blindly through choices; provide explicit choices with selected state.
3. An OPERATIONS panel occupies nearly all the mobile battlefield and exposes developer-style controls.
4. Generation status remains in a 100% panel with CANCEL; show a non-blocking Site Ready state instead.
5. Upper battlefield title prints procedural metadata including generator tokens; keep concise site title and put diagnostics in inspector.
6. campaign home is one tall vertical form, causing repeated scroll between personnel, purchases, contracts, and export.
7. Stacked modal and settings panels risk competing for pointer events and viewport real estate.
8. index.html and breach.html duplicate tactical controls; designate a single shared layout/handler contract.

## Flow coverage and critical acceptance

1. Launch -> Continue / New / Quick Play / Import: correct saves and non-destructive cancellation.
2. Campaign -> roster -> kit -> purchase -> mission -> report -> return: retained state and correct balances.
3. Quick Play -> select operator -> plot line -> node -> door -> GO -> pause -> results -> retry: responsive touch interactions.
4. View and camera mode changes during active planning: do not erase waypoints, knowledge, or spawn new enemies.
5. Map Lab -> generate -> ready -> play: status resolves and last requested seed wins.
6. Operator Lab / Asset Lab / Physicality Lab: visible canvas and all diagnostics accessible.
7. Replay view/speed/timeline: no state mutations outside replay.
8. Keyboard, touch, reduced motion, narrow viewport, safe areas: no inaccessible dismiss or clipped destructive actions.

## Staged implementation record

- 00 Audit (this document).
- 01 Shared tokens, base controls, visual feedback.
- 02 Shared primitives and interaction semantics.
- 03 Navigation / view vs mission-state split.
- 04–09 Battlefield and tactical control redesign.
- 10–14 Entry, Campaign, roster, armory, Quick Play.
- 15–16 Briefing, debrief, replay.
- 17–19 Labs.
- 20–21 Tactile polish and regression cleanup.

This inventory documents observed code paths, not an assertion that every button has been verified in a running browser. Validate each modified flow against the actual game as builds land.
