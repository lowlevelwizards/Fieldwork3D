# Dispatch D15 — Physical suspect custody, stage-gated design and implementation

## D15.0 audit of actual simulation authority (2026-11-17)

- D9 CHALLENGE already validates a living, visibly identified hostile; GO-time verifies sight, physical range, door/body sweep, a 0.48 s spoken action, and a six-second refusal cooldown. The existing morale/suppression decision, not a new PRNG, determines compliance.
- `commitSuspectSurrender` currently sets `surrendered=true`, **health=0**, and **injuryStage=3** to remove a compliant hostile from the existing downed-target combat/nav logic. This is not a conscious, mobile, restrained suspect, nor handcuffing.
- Current capture requires its specific target's `health<=0`, then the existing physical objective-secure interaction and extraction. A surrendered target scores better, but `captureSecured` is not a generic custody ledger.
- Neutral SECURE/FOLLOW applies only to distinct unarmed `CivilianActor`s and is *not* detention; this must never be relabeled as suspect arrests.
- D10 reports challenge, refusal, surrender and attributed harm; it does not establish lawful arrest, restraint or detention.
- `PlanNode.interaction`, `TeamActor`, `Session`, contextual palette, replay event metadata, fog, and checkpoint snapshots all have separately owned contracts. A real new interaction must be reflected in each authoritative owner and tested against old recordings.

## D15A — custody authority before cosmetic claims

**D15.1:** A pure, read-only eligibility/classification module distinguishes active, legacy-surrendered/down, unresponsive, and genuine *future* living-compliant suspects. It is a preflight policy, not an arrest; no changes to combat, movement or save formats. Test legacy cases, impersonated civilians, operators, and malformed health.

**D15.2:** Design and test a single authoritative living suspect submission transition that does not silently kill or incap its target. Verify combat targeting, threat checks, casualty scoring, AI movement, animation, and replay before changing the live surrender path. Backwards compatibility for older recordings must be explicit.

**D15.3:** Only after D15.2, implement a timed, physically reachable, visible, interruptible, targeted custody order. It must fail safely on movement, lost line of sight, renewed resistance, operator loss, and occupied/invalid target. Custody needs its own proof, not the reused `captureSecured` mission flag.

**D15.4:** Expose the order only for eligible recognized targets and only to Dispatch unless an explicit global-gameplay decision is made. Add distinct after-action evidence for surrender versus confirmed physical custody, not fictitious arrests.

**D15.5:** Run bounded fixed-seed end-to-end capture and non-capture tests, civilian interaction tests, old-save/replay tests, fog/LOS tests, four-person simultaneous contact resolution, and the critical type/build checks. Merge only as a logical checkpoint after a green PR and verified previous public Pages build.

## Hard exclusions and safety

No new warrants or automatic lawfulness rulings, no guaranteed compliance, no remote restraint, no tactical teleportation, no rewrites of stored D9/D10 outcomes, no change to non-Dispatch campaign rules through a briefing label, and no unconditional actor health changes to represent a verbal surrender. The full custody interaction is **not implemented** at D15.1.
