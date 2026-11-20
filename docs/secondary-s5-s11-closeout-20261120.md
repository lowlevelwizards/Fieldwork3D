# Secondary weapons — full completion / release acceptance

Date: 2026-11-20. Canonical integration branch: `feature/secondary-s5-s11-closeout-20261120`.

## Current production baseline
- **Complete foundation:** 4 Glock model families, physical modular geometry, Arsenal gallery and Workbench, saved builds, issued equipment, magazine identity/location, physical hip/chest/pack carry, reversible S5.1 switch *state*.
- **NOT COMPLETE:** S5.2 tactical execution and presentation, S6 pose/visual transfer, S7 live handgun firing, S8 sidearm reload, S9 integrated controls/status, S10 replay and debrief.
- S5.2 draft #1841 is deliberately not a production release; its changes are ported onto current main in this branch rather than merging the stale draft.
- Do not merge a switch-only change without functional pistol readiness. Avoid false affordances and silent primary firing.

## S5 — order/authority integration
- [x] Branch created from current main to retain performance/UI consolidation already merged.
- [x] Explicit authored `switch-weapon` plan nodes with insertion and undo/redo.
- [x] Only operator with issued Glock can draw; no NPC auto-issue.
- [x] Deterministic and reversible fixed-step switch; preserve independent rifle inventory.
- [x] Gate hidden rifle firing during selected/transitioning pistol.
- [ ] Switching during paused/resumed plans and traversal verified in browser; canceled/reversed actions do not strand weapon.
- [ ] Critical CI passes.

## S6 — poses and ownership
- [x] S6.1 implemented: one issued Glock visual interpolates from holster to solved firing wrist; deterministic replay fraction, no duplicate model (CI validation pending).
- [x] S6.2: pure bounded two-hand Glock ready, ADS, retention and reload-reach IK targets integrated in the existing operator pose publisher; full motion, recoil, collision and browser acceptance still required (CI pending).
- [ ] Finish high/low-ready variants, pistol recoil, fingertip/magazine physical contact, and full combat/obstacle pose parity.
- [ ] Transition-friendly physical clearance and no barrel-through-neighbor; weapon pose must correspond to real shot-time muzzle.
- [x] S6.1 preserves the existing mesh and appearance cache; no per-frame Glock rebuild (CI validation pending).

## S7 — authoritative combat
- [x] S7.1–2: real Glock muzzle/shot-time clearances flow through the shared target, civilian, friendly, cover and damage pipeline; no independent hit oracle (critical CI pending).
- [x] S7.2–3: 9mm profile, acquisition/cadence/recoil, actual Glock muzzle and reusable muzzle flash, shot/casing identity, shared impact/tracer, 9mm sound-bank fallback (critical CI pending).
- [x] S7.2: each approved ignition spends exactly one issued Glock round, no primary magazine/reserve mutation; 9mm test and teammate-lane veto committed (critical CI pending).
- [x] S7.2: use existing engagement acquisition, readiness, rules-of-engagement gates, sprint/medical/traversal limitations, shared physical safety and shot recording. Suppression with pistol is held rather than fabricating primary shots (critical CI pending).
- [x] S7.2/S10.3: shot/casing/replay ledger and shot inspector preserve Glock model and 9×19 mm identity; battle-event text labels GLOCK 9MM (critical CI pending).

## S8 — reload / inventory
- [x] S8.2/S8.4: authored, direct live and automatic emergency reloads use an independent pistol timer and actual carried magazine IDs (critical CI pending).
- [x] S8.1 inventory-only exchange quotes use actual issued serials, no added rounds, retain old rounds or explicitly report dropped magazines. Persistence now accepts an honestly exchanged loaded serial.
- [x] S8.2: fixed-step authored RELOAD order switches by selected hand, uses accessible issued ID and transfers inventory only at insertion; no rifle ammo touched (CI validation pending).
- [x] S8.3: one actually issued spare-magazine mesh moves from its real hip/rig/pocket/pack socket toward the solved support wrist and restores on cancellation/seek; pistol shell/floorplate state follows timed insertion (critical CI pending).
- [ ] Replace the temporary simple magazine geometry with a full authentic detachable magazine body, finish ejected-magazine travel and refined hand grip choreography.
- [x] S8.2 inventory/order guards for inaccessible/overflow spares, missing kit, full magazine, and before-insertion cancellation (CI pending).
- [ ] Validate live mission belt loss, interruptions across same-tick replanning and complete after-action accounting.
- [x] S8.3 live kit/pouch reconciliation preserves ONE issued Glock mesh through loaded/spare serial swaps; rehomes exact magazines without rebuilding the firearm (critical CI pending).
- [x] S8.2 timed insertion is one atomic exchange conserving issued magazine rounds (focused tests committed, CI pending).
- [ ] Verify save/reload, replay rewind, reorder, failed orders and mission restart end-to-end.

## S9 — interface / persistence
- [ ] Quick Play / Campaign shared Outfitter and Arsenal display the same physical issued weapon and customization.
- [x] S9.1: authored DRAW/HOLSTER in the real tactical palette (only when issued), projected hand at selected waypoint and reload availability from actual accessible spares (critical CI pending).
- [x] S9.2: compact operator HUD now shows actual active Glock 9mm, loaded/issued spare round totals and independent reload progress from one shared read-only selector (critical CI pending).
- [ ] Complete mobile/landscape UI acceptance and clarify active hand during transition.
- [ ] One source of truth for secondary configuration, equipped state, and availability; disabled options truly disabled.
- [x] S9.1 reuses existing tactical plan/context dispatcher; no separate pistol UI/controller introduced.
- [ ] Mobile browser acceptance and legacy-screen cleanup verification.
- [ ] Mission, new mission, preview, campaign and saved equipment carry forward coherently.

## S10 — replay / debrief
- [x] S10 foundation: sample/restore the explicitly authored switching fraction in replay; interpolate draw over 20 Hz samples and reset absent legacy state on seek.
- [x] S10.2: replay frames carry actual secondary mag serials/rounds and in-progress reload state with structural sharing; seeking back restores historical inventory (CI pending).
- [ ] Reconstruct fired pistol shots, impacts, physical magazines, reload animation and clip/debrief details.
- [x] S10.3: immutable recorded shot now carries actual Glock model and 9×19 mm; shot inspector and replay audio use shot-time identity, not the holstered rifle (critical CI pending).
- [x] S10.4: after-action combat report and replay JSON exports now preserve the fired Glock model/9×19 mm caliber instead of the holstered primary (critical CI pending).
- [ ] Full debrief combat tab/highlight browser QA still required.
- [ ] Deterministic seek, clipping, restart and legacy save compatibility.

## S11 — regression, performance and release
- [x] Authored switch, cancel/lost-kit, baseline ammo conservation and replay-compatibility tests committed (CI rerun pending).
- [x] New focused S6.1 physical mesh and S8.2 timed magazine tests committed (CI pending).
- [x] S6.2 pose target bounds and real-rig tests, and S10.2 exact magazine/reload replay seek tests committed (critical CI queued).
- [x] S7 live full-pipeline shot and ally-lane veto, S7 flash, S8 direct/emergency reload and S9 waypoint authoring regressions committed (CI pending).
- [x] S8.3 physical issued-magazine handoff/pistol instance preservation/rewind, S9.2 ammo HUD selector, S10.4 after-action tests committed and added to focused workflow (CI pending).
- [ ] Complete true detached-old-magazine body animation, browser firing/replay QA and repair any CI failures.
- [ ] Focused end-to-end: 9mm shot, damage, full/partial magazine, retention/emergency reload, count conservation, no ghost magazines.
- [ ] GitHub Actions: focused S5–S10 TypeScript/build + contract tests queued at latest PR head; fix failures before marking any stage verified. Desktop/mobile browser acceptance still outstanding.
- [ ] Final CSS/TS dedup, disposal correctness, animation transition hitches and inspection orbit parity.
- [ ] Confirm no queued/failed deployment; merge only at validated checkpoint, then verify Pages serves exact expected SHA.

## Release invariant
An operator can equip a customized Glock, visibly carry it, author a draw, aim and safely fire real rounds, reload from issued magazines, holster, return to primary, and replay/report all outcomes without desynchronization, duplicate inventory or false affordances.

Never check a box as complete based only on a source edit; verify the actual integrated behavior or targeted CI evidence.

## Latest integration checkpoint (S7–S10)
- Branch remains DRAFT PR #1868; no integration release without exact-head build and focused tests.
- S7 modeled muzzle, 9mm profile, confirmed physical shared shot, real round consumption, shot-time Glock identity and actual-model flash: implemented, awaiting GitHub runner validation.
- S8 real authored, live and emergency magazine exchanges use one inventory/world-drop commit. A selected issued spare's actual carried mesh follows the support wrist; full authentic detachable mag geometry/ejected-mag choreography still outstanding.
- S9 palette and authoring use projected weapon hand and issued spare availability; HUD now reads selected Glock rounds/issued reserve from a single selector. Mobile/Quick Play acceptance still needed.
- S10 shot-time 9mm ledger, replay inspector/sound, debrief report and export identity: implemented, awaiting CI and browser verification.
- S11 workflow repaired and focused domain tests expanded to live shot, ally veto, physical magazine handoff, reload, HUD and debrief. GitHub Actions remained queued/canceling earlier attempts as newer heads were committed; current exact-head success remains REQUIRED before merge.
