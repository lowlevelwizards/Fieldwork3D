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

## D15.2A–C — Surrender-aware operational policy (staged, not yet enabled)

- A shared, pure operational predicate marks only living, non-submitted actors as active combatants. A specific surrendered *or* downed hostile can satisfy the original capture-target resolution, but this is **not a completed custody interaction**; the existing operator proximity/physical LOS secure step remains necessary. Invalid health does not create a successful capture.
- The five existing objectives preserve prior behavior for legacy D9 surrendered/down actors. Hypothetically living-submitted hostiles no longer block clear or hold clocks, or require being shot to enable the original capture objective.
- Firing acquisition excludes surrendered targets, the authoritative shot commit refuses a surrendered shooter or target, and fixed-tick actor intent does not turn a living-submitted hostile back into an AI agent. The surrendered person remains a physical live body for collision.
- Focused tests cover a manually constructed living-submitted actor through real fixed-step capture/clear/hold progression, no remote capture completion, the shooter/target guards, malformed data, and D9 legacy semantics.

**Scope boundary:** This stage deliberately leaves `commitSuspectSurrender` (D9) unchanged, including its legacy downed representation. No gameplay creates a living-submitted actor yet; no handcuff action, custody state, replay schema, or legal arrest record has been implemented. D15.2D must perform an explicit isolated live-transition and replay/pose acceptance pass before activation in Dispatch. This PR remains draft; do not merge on green tests alone.
