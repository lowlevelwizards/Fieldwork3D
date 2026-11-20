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
- [ ] Real right/left hand IK and support hand, pistol ready/aim/retention/low/high/movement/recoil/reload, smooth and interruptible.
- [ ] Transition-friendly physical clearance and no barrel-through-neighbor; weapon pose must correspond to real shot-time muzzle.
- [x] S6.1 preserves the existing mesh and appearance cache; no per-frame Glock rebuild (CI validation pending).

## S7 — authoritative combat
- [ ] Use the shared target visibility/friendly/civilian/cover/damage pipeline for 9mm, not a second hit oracle.
- [ ] Glock-specific cap, cadence, recoil/recovery, turn, accuracy, falloff, muzzle, impact/audio/tracer.
- [ ] Actual round consumption from `equipment.secondary.loadedRounds` with zero hidden primary usage.
- [ ] Respect HOLD/RETURN/FOCUS, movement, suppression, incapacitation, sprint, reload, safety, and replay.
- [ ] Record correct weapon identity in each battle event.

## S8 — reload / inventory
- [ ] Tactical reload orders and automatic emergency reload when eligible; independent timers for active pistol.
- [x] S8.1 inventory-only exchange quotes use actual issued serials, no added rounds, retain old rounds or explicitly report dropped magazines. Persistence now accepts an honestly exchanged loaded serial.
- [x] S8.2: fixed-step authored RELOAD order switches by selected hand, uses accessible issued ID and transfers inventory only at insertion; no rifle ammo touched (CI validation pending).
- [ ] S8.3 actual detachable pistol magazine and synchronized hand-motion rendering.
- [x] S8.2 inventory/order guards for inaccessible/overflow spares, missing kit, full magazine, and before-insertion cancellation (CI pending).
- [ ] Validate live mission belt loss, interruptions across same-tick replanning and complete after-action accounting.
- [ ] Real carrier contents follow holster and magazine model, both before and after reload.
- [x] S8.2 timed insertion is one atomic exchange conserving issued magazine rounds (focused tests committed, CI pending).
- [ ] Verify save/reload, replay rewind, reorder, failed orders and mission restart end-to-end.

## S9 — interface / persistence
- [ ] Quick Play / Campaign shared Outfitter and Arsenal display the same physical issued weapon and customization.
- [ ] Tactical palette shows DRAW/HOLSTER only when valid. Selected hand, loaded rounds and spares are legible.
- [ ] One source of truth for secondary configuration, equipped state, and availability; disabled options truly disabled.
- [ ] No duplicate workbench/gallery, mobile overlay, or obsolete sidearm commands.
- [ ] Mission, new mission, preview, campaign and saved equipment carry forward coherently.

## S10 — replay / debrief
- [x] S10 foundation: sample/restore the explicitly authored switching fraction in replay; interpolate draw over 20 Hz samples and reset absent legacy state on seek.
- [ ] Replay and camera reconstruct held pistol poses, shot/reload timing, magazine identity and complete movement.
- [ ] Combat report uses correct 9mm weapon, shooter, target, impact and wounds.
- [ ] Deterministic seek, clipping, restart and legacy save compatibility.

## S11 — regression, performance and release
- [x] Authored switch, cancel/lost-kit, baseline ammo conservation and replay-compatibility tests committed (CI rerun pending).
- [x] New focused S6.1 physical mesh and S8.2 timed magazine tests committed (CI pending).
- [ ] Complete domain tests for 9mm fired rounds, both-handed pose and no ghost primary shot.
- [ ] Focused end-to-end: 9mm shot, damage, full/partial magazine, retention/emergency reload, count conservation, no ghost magazines.
- [ ] Critical build/typecheck and desktop/mobile browser smoke on tactical, Arsenal, Quick Play, replay.
- [ ] Final CSS/TS dedup, disposal correctness, animation transition hitches and inspection orbit parity.
- [ ] Confirm no queued/failed deployment; merge only at validated checkpoint, then verify Pages serves exact expected SHA.

## Release invariant
An operator can equip a customized Glock, visibly carry it, author a draw, aim and safely fire real rounds, reload from issued magazines, holster, return to primary, and replay/report all outcomes without desynchronization, duplicate inventory or false affordances.

Never check a box as complete based only on a source edit; verify the actual integrated behavior or targeted CI evidence.
