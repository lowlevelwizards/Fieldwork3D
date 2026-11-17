# Dispatch D9 — Suspect and civilian contact (implementation audit)

D9.0 baseline:
- Live civilians are distinct, unarmed actors with health, fear, physical
  navigation, `compliant` and `escorted` states. SECURE and FOLLOW are already
  authored, fog-restricted, proximity/LOS-validated physical orders; not remote
  state transitions. Rescues require physical handoff and extraction.
- The existing hostile actor has morale, suppression and a surrendered flag.
  Existing AI surrenders only from witnessed danger and morale resolution;
  surrender currently marks the actor down (health=0, injury stage 3).
  Capture missions require the actual designated target down/surrendered,
  a physical objective-secure action and extraction.
- No authored player CHALLENGE order for a living hostile yet. Context menu
  does not offer a visible-suspect action. Combat, replay and scoring already
  record surrender.
- Existing free-form "SECURE civilian" is a stop/reassurance command, not
  handcuffing or detention. Do not label it as arrests or implement false
  restraint/ROE mechanics. No second arrest state machine.

Stages:
D9.1: centralize surrender state transition; add a physically verified
operator-issued CHALLENGE order with bounded range, facing, LOS, short voiced
action, and morale-based acceptance or refusal. Challenging must not
magically coerce calm defenders. Never accept unseen/distant or dead targets;
no repeated per-tick roll or infinite surrender-spam.
D9.2: expose contextual CHALLENGE only for visible living hostile near
the operator's authored route end; target a stable actor ID. Preserve
ordinary SECURE/FOLLOW and other game modes' existing rules.
D9.3: truthful tactical and after-action event evidence for warnings,
refusals and surrender, without new arrest grades/ROE scoring.
D9.4: focused regression for queued execution, fog/LOS, refusal/cooldown,
capture lifecycle and older civilian interactions. Merge only after critical
CI and prior successful public Pages verification.

Deferred: handcuffs, search, suspect escorts, multiple arrest subjects,
civilian ROE, legal warrants, new enemy guns/AI systems, hostage negotiation.
