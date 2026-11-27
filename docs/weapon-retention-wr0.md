# WR0 — Weapon retention baseline and release contract

Base: main 0a283e05da97c469a78f2b7ce73d454ca762a066. This is a source audit, not a gameplay capture.

## Existing owners and conflicts
- breach-pose-contacts.ts: action priority and left/right ownership; treatment owns both, door/throw/push/guard own support hand, reload owns magazine and firing hand. Lockpick is currently routed through door ownership; restraint through equipment/throw. Transport is absent.
- breach-pose-action-state.ts and breach-pose-decision.ts: existing centralized, read-only action evaluation; extend, do not bypass.
- breach-operator-animation-controller.ts: held primary becomes invisible at secondary fraction .50; generic treatment moves both arms independently of weapon. Down/surrender use an alternate render mesh. Secondary draw is called after the final pose publication even when the action has borrowed hands.
- breach-operator-equipment-output.ts and breach-operator-pose-output.ts: staged weapon/attachment outputs; only final commit may publish transforms.
- breach-operator-sling-pose.ts: three render-only spans, hardcoded chest-local routing and generic gun endpoints; follows weapon, never supports it. No sling default, two-point optional. Weapon accessories and rig strap meshes must share eventual socket truth.
- equipment-weapon-assemblies.ts, breach-weapon-accessories.ts, equipment-weapon-inventory.ts and arsenal/naming.ts: sling slot, accessory art, cost and labels. Preserve migration of existing loadouts.
- secondary-switching.ts and secondary-holster-visual.ts: fixed-step reversible switch fraction and one pistol mesh; retain gameplay authority. Holster cradle must not follow a hand assigned to another action.
- breach-suspect-weapons.ts: actual world dropped weapons are separate from cosmetic droppedGun. Ground placement requires world identity, not an extra mesh or renderer-only inventory.
- breach-3d.ts and breach-operator-animation-contract.ts: live/replay pose snapshot ingress. Labs must use the same policy; preview-only unarmed/sidearm auditions may intentionally suppress equipment.
- breach-order-medical.ts, breach-simulation-motion-phase.ts: future CT transport requires two hands and space around torso/shoulders; no new transport motor in WR.

## Action matrix
Held: ordinary readiness, kick, reload (one supporting hand stays on weapon). One-hand retained: door operation, brace, throw, short retrieval, wedge, simple intel. Hands free: treatment, restraint/search, lockpick, tool/charge use, transport and climb. A secondary in use requires retention of the primary. A drawn pistol needs its holster before both hands become available. Action conflicts must be mediated by the existing action owner, not independent timers.

## Design and compatibility
Retention locations: held, one-hand, front/side/back slung, holstered, grounded, relinquished. Distinguish target/request from achieved physical state. No sling + stationary hands-free may request ground placement; no sling + mobile hands-free requires an explicit placement/leave/retrieve workflow, never invisible attachment. No actual ground placement until world custody integration. Default two-point is a later migration decision for new loadouts; never silently alter saved explicit no-sling builds.
Sling geometry and suspended motion are presentation-only; authoritative action eligibility, inventory, ownership and replay timing are fixed-step. No ballistic or AI changes in WR0/WR1. Defer exact attachment socket positions to weapon art coordination.

## Rolling gates
A: WR0–WR3 policy, sockets and sling equipment; B: WR4–WR6 pose and transitions; C: WR7–WR9 interaction/switch migration; D: WR10–WR11 world ownership/clearance; E: WR12–WR13 lab and final validation. Gates may be combined if dependent changes are not safe to ship alone. No production release on pending/failing deployment or unverified Pages revision. Critical check: TypeScript, relevant focused tests, live pose/replay smoke at visual stages. No claims of live verification from source tests alone.
