# Build 22.00 — Existing medical system and authority audit

- `breach-combat.ts` defines four injury categories and movement/aim/reload penalties.
- `breach-game.ts` applies armor, wound severity, hit region, downed and mission state in the fixed step. Retain `injuryStage` and `health` as the sole combat ability authority.
- `breach-wounds.ts` determines hit-region/pose; keep render-only posture separate.
- `equipment-catalog.ts` includes `medical-basic`, `medical-trauma`, and broad medical slot.
- `campaign-state.ts` has medical resupply and recovery-day treatment. Separate between-mission care from in-mission stabilization.
- `breach-replay.ts` samples actor states. New wounds and interventions must be deep copied.
- `breach-operator-rig.ts` owns a deterministic pose; new medical cues must be driven by actor action timestamps, not free-running render motion.
- `breach-plan.ts` and tactical context menus own staged orders. Do not author parallel navigator or push friendly operators.
- Quick Play consumables and injury state reset between rounds. Campaign preserves consequences.

## Stage contract
22.01: capped per-actor wound records from actual penetrating hits only.
22.02: cumulative fixed-step bleeding thresholds; never heal a hit or alter armor.
22.03: finite medical items constrained by equipped kit.
22.04: deterministic interruptible treatment; consume supplies on application.
22.05+: IK presentation, evacuation, campaign outcome, recovery, tool integration.

## Non-negotiable invariants
- Never turn armor-stopped hits into wounds.
- No wound progression after a terminal mission phase.
- Stable replay snapshots and no duplicate IDs or treatment expenditure.
- Equipment and campaign ownership must not be modified from the renderer.
- Backward compatibility and original balance for nonbleeding shots.
