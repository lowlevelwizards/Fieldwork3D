# Campaign Operations & Consequences — OC1–OC10

## Player-facing design
A mission is an operation with independent tactical, human, intelligence and campaign consequences. Primary objective failure does not erase rescued comrades or recovered intelligence. An organized retreat is allowed after the squad has actually deployed and started a mission, but never teleports personnel out. The player chooses how long to remain under threat to gather evidence or rescue casualties. Quick Play stays independent of campaign persistence.

## Single-owner authorities
- `breach-game.ts` / `breach-simulation-phases.ts`: the same 60 Hz fixed-step loop executes tactical mission and timed optional evidence.
- `breach-operation-outcomes.ts`: pure terminal outcome derived from actual Session positions, objective stage, completed withdrawal flag.
- `breach-optional-intel.ts`: side evidence lifecycle; distinct from `breach-objective-intel.ts` (briefing knowledge), `breach-intel.ts` (architecture), and the primary `intel` mission carrier.
- `breach-mission-reporting.ts` / `breach-operations.ts`: authoritative score and detailed debrief projections.
- `breach-campaign-flow.ts` / `campaign-state.ts`: one existing exact-once settlement. The original appliedResults protection also covers partial recovered evidence.

## OC1 — Independent operation outcome
- Preserve the original `won/lost` phase for compatibility with campaign, replay and archival consumers.
- Add `completed/withdrawn/overwhelmed/failed` disposition, secured-objective flag, mobile extracted IDs, physically evacuated downed IDs, and left-behind IDs.
- `withdrawalRequested` is authoring intent only. Only the mission loop can set `withdrawalCompleted` after the physical gate.
- Do not infer death from zero HP. Incapacitated and missing are distinct from confirmed death.

## OC2 — Voluntary withdrawal
- A contextual Settings control lets Campaign and Quick Play withdraw or cancel; a dashed WITHDRAW destination marker stays visible in Floor Plan and projected 3D views while the command is active.
- The still-mobile squad can close out together by physically reaching extraction, or individually queue exits after arriving at the gate. The next fixed GO tick rechecks the position before a member is permanently removed from active combat and archived for reporting.
- Downed operator locations and the actual carriers of evidence are preserved. Nothing is teleported.
- Keep ordinary objective-dependent extraction rules and outcomes unchanged when withdrawal is not requested.
- An EXTRACT SELECTED control queues an irreversible departure while paused in withdrawal mode; it never teleports, and carrying operators must release the casualty at the zone or complete squad extraction together.
- Already extracted people disappear from live AI, shots, movement, selection and fog, but remain in the replay/career/score and as verified couriers of recovered intel. Cancelling withdrawal cannot restore an evacuated character.

## OC3 — Optional intelligence
- Deterministic 2–6 small pickups depending on map room count; no new worldgen RNG.
- Physically plausible room spots with a simple cover clearance check; primary objective location excluded.
- Operator cone and actual unobstructed sight required to discover, regardless of floor-plan or full-view architectural mode.
- Once discovered, evidence appears in Floor Plan and 3D projected tactical overlays, plus small chunky three-dimensional dossier/radio/laptop props; never in a historical replay without its own evidence.
- One explicit GATHER INTEL command when the selected operator is in real contact, taking 1.2s of fixed-step uninterrupted presence.
- The collecting operator holds the actual item. Incapacitation drops the item at their physical location, allowing a different operator to recover it.
- Only living carriers physically within the extraction radius are credited. Collected evidence not extracted is not campaign-awarded. Replay content from past builds has no fabricated pickups.
- Add tactile audio, physical props, map-context routing and simultaneous interactions only after movement and LOS acceptance.

## OC4 — Wounded recovery
- Reuse existing treatment, real injury, drag and carry orders.
- The report distinguishes stabilized, critical, actually evacuated, and left behind. Extraction alone does not prove survival or permanent death.
- Career journals record physical casualty evacuation and unrecovered status independently. An unrecovered downed member moves to a nondeployable MIA archive with explicit unconfirmed fate; it never automatically heals or becomes confirmed killed. The squad cannot deploy with a missing assigned member: preflight requires a replacement.
- OC9: an MIA veteran creates a named rescue follow-up contract. A genuine incapacitated rescue patient is placed in the tactical mission, and the existing DRAG/CARRY order must bring them to extraction. The after-action receipt certifies the physical carrier; campaign settlement restores the original career to reserve with prolonged medical recovery. A failed or unverified attempt leaves the patient MIA and generates a follow-up attempt.
- The same transport toolbar now offers discovered downed civilians and the designated downed capture target without disclosing unseen people. Squad medical-supply recovery remains a separate action.
- Future expansions: confidence-aware post-op prognosis and explicit death confirmation. Evacuation does not independently prove long-term recovery; there is no automatic permadeath from ambiguous downed state.

## OC5 — Score and report
- Organised withdrawal gets its own scoring base and grade, not an automatic F.
- Actual casualty evacuations and physically recovered optional intel award bounded additional points.
- Structured debrief reports objective, disposition, recovered evidence, extracted and missing IDs.
- Combat/forensic timelines remain historical and must not backfill unrecorded hit facts.
- Quick Play gains mission score only.

## OC6 — Campaign continuity
- Existing save schema v1 remains compatible through optional report fields.
- The single `resolveOperation` authority adds recovered intel even from failed operations. Existing intel capacity of 9 and exactly-once result-ID gate remain.
- Withdrawal, verified intel couriers and physical casualty recovery enter actual operator career journals; merely collected evidence does not earn extraction service credit.
- Existing medical recovery and field-inventory settlement remain authoritative.

## OC7 — Intel improves future briefings
- Existing `campaignIntelBalance`, `reconContract`, `contractObjectiveIntel` and `setObjectiveIntelLevel` already spend earned intel to improve future objective-location confidence.
- Preserve approximate vs confirmed uncertainty and prevent architectural full-view from leaking unobserved enemies.
- Two or more physically recovered side-intel items on a failed mission create a linked, approximate-intel follow-up contract using the existing campaign contract pipeline.
- Future expansion: tactical entry leads, weapons estimates, longer targeted intel chains, and enemy relocation.
- Do not assert those prospective systems are implemented before their own contracts and acceptance checks.

## OC8 — Acceptance / release gates
1. Same seed produces identical side-intel IDs and positions; training produces none.
2. No pickup location leaks from undiscovered buildings or full-view architecture.
3. Dead/interrupted/remote gather cannot finish and no item is credited twice.
4. Incapacitated courier drops the item; another operator can recover it.
5. Partial withdrawal cannot complete until living team members are at extraction.
6. Left-behind casualty is not called evacuated. Downed does not prove dead.
7. Mission result settles once, including recovered intel after primary failure.
8. Quick Play makes no campaign change; legacy campaign imports survive.
9. Typecheck, build, focused regression tests and verified release pipeline must pass before merge.
10. Reconcile any concurrent main work before merging. Do not queue redundant Pages deployments.

## OC9 — Missing-personnel recovery and roster continuity
- Generate one deterministic recovery response for each incapacitated missing veteran after real mission settlement, preserving the exact career identity and unconfirmed fate.
- Install a downed rescue patient in the standard mission authority. A verified outcome requires actual live custody and extraction; pressing Withdraw or completing an unrelated objective does not rescue anyone.
- A lost veteran cannot deploy, and a rescued veteran cannot redeploy until medical recovery completes. Personnel/briefing explain the recovery requirement.
- Never duplicate careers, rewards, journals, follow-up cases or operator identity on repeated reports or imports.

## OC10 — Individual physical extraction
- The player selects an actual mobile operator at extraction, orders EXTRACT SELECTED while paused, then presses GO. The authoritative fixed-tick retires the actor at that exact position; moving away from the gate before GO cancels that pending order safely.
- Extracted actor snapshots remain in full mission/debrief/career accounting but are not in the active actor array. The archived courier retains any optional or primary intelligence held on departure; a real extracted primary intel courier can complete the objective after remaining squad accountability.
- The team can still withdraw with a downed casualty left behind, but those people remain missing rather than being teleported to safety. A carrier holding another patient cannot leave individually; preserve joint casualty-transport authority.

## Remaining scope / hard release gates
- Browser QA should confirm the live scene and replay smoothly retire individual operator rigs without selection flicker; no per-frame extraction workarounds.
- Rich casualty prognosis, usable contextual civilian medical care and permanent-death evidence remain for their own medical stage.
- AI escalation during searches, strategic enemy relocation, equipment-drop economy and deeper branching intelligence remain future campaign expansions.
- All latest OC9 code must pass TypeScript, relevant mission tests and browser acceptance before merge. Never silence unrelated failing CI by changing frozen gameplay fingerprints or deploying into an active Pages queue.
