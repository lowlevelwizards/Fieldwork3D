# L1.5 — Functional night vision, scoped implementation
Fieldwork Breach | 2026-11-16

## Intent
Introduce a physical helmet-mounted, powered/deployed monocular night-vision device on a real operator. Independent, player-operable, represented in the operator rig, and visible through a selected-operator low-light optical treatment in both existing tactical render modes. No new AI perception or fog authority until L1.6.

## Existing code audited
- Helmet field controls and models in `operator-helmet-field-policy.ts`, `operator-helmet-field-visuals.ts` and the wardrobe head modules provide cosmetic shrouds, goggles and battery accessories, not functional optics.
- `equipment-catalog.ts` has broad utility equipment, while real issued inventory is `equipment-loadouts.ts` and roster/Campaign equipment, not appearance. The nonpersistent `utility-nvg` equipment choice can be offered through the existing actual gear selection flows with the tradeoff of replacing the utility slot.
- `breach-tactical-control-commands.ts` owns light equipment actions; `ui/tactical-hud-controller.ts` is the common mobile/keyboard action surface. Gameplay phase and replay are separate.
- `breach-operator-appearance.ts` fingerprints static looks; `operator-visual-kit.ts` mounts helmet layers once per changed appearance; `breach-3d.ts` supplies the pose.
- `breach-replay.ts` snapshots operator dynamic state and rewinds via `applyReplayFrame`; old recordings lack the new field.
- `#breachCanvas` and `#breach3dCanvas` already show fogged, policy-approved imagery. Presentation-only optical grading can transform these rendered pixels without revealing any new underlying actor/map facts.

## Implementation contract
1. **Equipment authority (P0)**: an explicitly equipped `utility-nvg` monocular, an actual protective `head-helmet`, a compatible ACH/MICH/PASGT visible shell and a fitted effective `helmetField.shroud` are all required. PASGT can use its fitted historical bracket. Cosmetic goggle placements, rear battery case, strobe, goggles and default headwear NEVER issue a real NVG. No free retroactive upgrades to old loadouts, Quick Play or Campaign.
2. **Independent state (P0)**: new `nvgDeployed` actor state, default off. Validated toggle only in planning/running, living subject and actual mount. Fail is read-only, successful toggles invalidate existing lighting revision for downstream dependent presentation. No physics or shot authority changes.
3. **Live control (P1)**: show NVG on the existing action row only when an actual device is issued, including a disabled reason when it has no mount. Pressed/disabled/state and aria update with selection, health, replay and phase. Keyboard `N` activates the same button with existing dialog/photo/replay guards; touch uses same action. Shared click audio only on successful transition.
4. **Visual device (P1)**: distinct compact physically fitted monocular with a real shroud socket, flip-hinge, upper arm, objective and eyepiece; raised and deployed are two preallocated reusable mesh groups under the actual helmet. Cache by appearance fingerprint and do not update geometry per frame or alter collision.
5. **Selected-device optic (P1)**: modest green monochrome/high-contrast color treatment of rendered world canvases only when the *currently selected living operator* has mounted, powered and deployed NVG. Class removal on deselect, death, replay, restart, gear removal or view changes. No global textures, extra WebGL passes, fog changes or sight/memory grants. Replay can show the physically recorded deployed pose, but no live control and no live selected-POV effect.
6. **Lifecycle and compatibility (P0/P2)**: reset to stowed on new mission roster/Campaign setup. Start/restart includes the recorded operator kit/state; replay frames store deployed state explicitly, absent legacy field defaults to false upon seek. Do not rewrite older archives, scored training trial versions, existing weapon-light rules or user wardrobe choices. NVG equipment affects mass through existing catalog.
7. **Acceptance and release**: focused Node regressions, existing helmets, equipment, replay, tactical HUD and L1 light guards, then TypeScript/Vite build and GitHub Pages public SHA verification. No arbitrary time-based performance budget, new dynamic GPU lights, or additional thermal effects.

## Explicit L1.6+ deferrals
Observer-specific visual detection and identification bonuses, detectable IR illuminator signature, battery drainage/recharge, IR laser, night trials, glow/whiteout under bright lights, and full per-operator restricted NVG camera are deliberately not invented here. Do not imply that the selected-view tint automatically permits seeing farther or reveals unobserved sectors.
