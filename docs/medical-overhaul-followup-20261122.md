# Follow-up: fuller medical overhaul (deferred)

This contact/UI patch intentionally does not invent healing effects, new supplies,
blood types, injury outcomes, revive mechanics, or additional medical AI.

## Implemented now
- RESTRAIN: short physical contact without occupying the suspect/civilian center
- SECURE WEAPON: timed interaction + recorded weapon status + visual evidence tag
- TREAT: choose self or an observed nearby target before placing an order
- Explicit BLEEDING, STABLE (no active bleed, **not healed**), UNINJURED
  status and insufficient-supplies reason

## Medical M1–M5 candidates for a separate design review
- M1: unified, readable injury/vitals affordances for every observed patient
- M2: triage urgency, downed operator rescue and extraction decision clarity
- M3: explicit treatments linked to wound region and available field supplies;
  medically plausible abstraction without a simulator-sized micro-inventory
- M4: meaningful but bounded bleeding progression, stabilization, re-bleeding
  conditions and mission/campaign recovery implications
- M5: animation, sound, replay evidence, debrief timeline and persistent
  campaign aftercare, with deterministic verified outcomes

Keep blood loss/health authority unchanged until those contracts are reviewed.
