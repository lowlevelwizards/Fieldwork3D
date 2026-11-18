# EQA0 — fresh encounter-quality baseline (18 November 2026)

**Baseline:** `main` at `8729204346f56ea0c401ef02959f2bdfa6d246fa` (frozen before subsequent G36 integration commits). **Scope:** read-only audits, no gameplay/UI/AI/persistence changes or release.

**Exact green run:** https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44412489746 (all three jobs SUCCESS). First frozen run: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44412243371. Full JSON/observations are the three retained GitHub Actions artifacts (`structure.json`, `living.json`, `contact.json`). Reproduction entry point: `.github/workflows/encounter-quality-baseline.yml`.

## Method and interpretation

1. **Structure:** real generation and audits for 11 archetypes x 5 mission types, small scale, seeds 11–21, each building seed held across mission types (55 cases). Reports actual population, mission profiles, objective guardians, verified door/window alternatives, topology and hard validity. Same-building same-seed topology is expected; this matrix **does not** demonstrate cross-seed map variety.
2. **Living encounters:** 22 independently generated scenarios, seeds 11–32, all five objectives; real fixed-step 20-second Session motor/AI/civilians, diagnostic gunshot emitted at 1.5s near an actual hostile or civilian to observe responses, no forced actor states. `--living --doctrine-matrix` uses the existing `EncounterBehaviorSurvey` and authoritative simulation. The injected sound is an artificial **test stimulus**, not proof of normal encounter pacing or player experience.
3. **Contact/intel:** 20 generated small-site scenarios x Floor Plan/True Blind = 40 real 12-second Session motor/AI/replay trials, actual authorable approaches, not teleports or hidden-enemy target selection. In True Blind many legal orders stop at the briefed entrance, so no contact in that mode is **not evidence of a dull encounter**. Floor Plan script uses architectural objective/waypoints as existing G4d scripted benchmark; this is **not** an accurate replication of new default *unknown objective-intel* Quick Play and must not be advertised as an authentic modern unknown-objective playthrough.
4. All results are deterministic headless observations, **not** rendered 2D/3D, actual phone controls, complete missions, full player tactical choice sets, real device FPS, or subjective engagement.

## Results

| Gate / observation | Fresh result |
| --- | ---: |
| Generation matrix | 55 / 55 structurally valid |
| Building archetypes / objectives | 11 / 5 |
| Distinct encounter profiles in the matrix | 5 |
| Cases without nearby assigned objective security | **13 / 55** (design warnings, not necessarily invalid) |
| Living scenario samples / unique topologies | 22 / 22 |
| Invalid or inconsistent 22-case replays | 0 |
| Mean audited verified approaches / windows / alternate doors | 3.7 / 1.5 / 1.3 |
| Overexposed engagement-relevant room observations | **83** (141 across all rooms; no exposed-room denominator for rates) |
| Contact / first shot in 40 twelve-second scripted trials | 18 / 40 each |
| No confirmed contact in these scripted trials | 22 / 40; much of True Blind is entry-only |
| 40-trial invalid or unaccepted authoring outcomes | 0 |
| Sustained blocked actor frames / silently blocked door frames | **1,562 / 654** (diagnostics, not definitive cause) |
| Living-survey investigations started / without progress | 26 / 0 |
| Coordinated / retreating / surrendered hostile actors (per-case counts summed) | 30 / 19 / 8 |
| Cases with live civilians | 14 / 22; 16 active civilians total |
| Cases in which civilian state changed after the stimulus | 9 / 14 |
| Mission completions during short scripted baselines | 0 (not a failure criterion) |

## Reproducible problems / targeted review queue

### P1 — squeeze-only final MOVE landing at a known closed FRONT leaf (confirmed gameplay defect)

- `seed 20 / capture / floor-plan`: Moss remains beside CLOSED **unlocked** `FRONT` for ~10.8s, `319` frames classed as door blocking with `motorPause=none`; 6 route repairs; MOVE not completed. Observed motor position (485.02, 284.87), next and goal (482.70, 299.54), `FRONT` open fraction 0, no wedge, holder or lock. No confirmed visual contact. `doorCases` witness in artifact.
- `seed 26 / clear / floor-plan`: Rook similarly at CLOSED **unlocked** `FRONT` for ~10.83s, `320` door-blocked frames without pause, 6 route repairs; actor position (467.15, 299.90), next/goal (453.78, 301.69), open fraction 0. Firefight still occurs (first contact 0.3s, first shot 0.53s).
- `seed 25 / capture / floor-plan`: only 15 silent door frames, followed by 96 route and 182 wall-block frames; also genuine contact. Treat as separate mixed-cause route/clearance episode.
- `seed 11 / clear / floor-plan`: 277 wall-block frames, no contact; `seed 29 / hold / floor-plan`: 273 furniture-block frames despite confirmed contact. **Do not** classify these as locked-door failures.

**Forensic correction (EQA1, 18 Nov):** The problem is **not** a missed auto-open: for both seeds the chosen MOVE endpoint is on the **same side** of the closed FRONT leaf as the actor, and `crossesDoorThreshold` correctly returns false. The existing drag planner accepted terminal points with squeeze-only clearance to the real door leaf. Its ordinary `intelPassable` full-radius wall/cover check does **not** check the player's known closed door-frame clearance. The authoritative swept motor correctly refuses the too-close sideways stride. Attempts to fix this by opening an unrelated door would be physically wrong. Exact witness: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44412849073.

**Next implementation scope:** keep all intermediate squeeze transit, and only verify/correct the **final drawn MOVE landing** against a full-size operator and the visible *remembered closed* door-frame geometry (never hidden live leaf state), with bounded in-line retreat or atomic rejection. Retain actual hinge, lock, collision, fog, WATCH and undo authority. Independently reproduce both seeds; changing ordinary door opening is out of scope. Run full physical acceptance on any gameplay merge.

### P2 — objective defense occasionally absent even in prepared scenarios

Exactly 13/55 non-clear mission rows had no assigned nearby security at the current 175-unit eligibility gate, but **not all warrant a guard**. Notable:
- `seed 14 / retail / hold / prepared`: 2 hostiles, none nearby the objective.
- `seed 17 / warehouse / intel / prepared` and `rescue / prepared`: 2 hostiles in each, no nearby guardian.
- `seed 13 / apartment / capture / clustered`: 3 hostiles in one occupied zone, none near capture focus.
- `seed 12 / townhouse / rescue / clustered`: **zero hostiles**, which is a valid quiet/rescue case; it must **not** be force-populated to satisfy a guard metric.
- Remaining case IDs with warning: townhouse12 intel; retail14 rescue/capture; garage16 intel; restaurant18 intel; utility20 intel/rescue; clinic21 rescue.

**Next implementation scope:** compare the **existing, legal** cover/room options in specifically prepared missions. Consider a bounded, seed-stable ranking bonus for valid pre-existing objectives only if a genuine approach choice improves, but never force a hostile count, teleport, override the seed distribution or overpopulate rooms. Direct sight, patrols and physical cover remain authoritative.

### P3 — low tactical cover variety/long lines in some rooms

The 22-case quality survey flagged 83 engagement-relevant overexposed-room observations and 141 raw room observations. This is a **warning count**, not a distinct room-failure rate. Inspect room purpose, legal fixture types, fire/cover obstruction, sightlines and usable doors on actual rendered seeds before adjusting furnishing. Avoid conjuring new obstacles to satisfy metrics.

### P4 — civilian reaction is real, but rescue communication needs player validation

Nine of fourteen scenarios with civilians showed state changes after the scripted acoustic event; freezing, fleeing, and hiding all occurred. In `seed 13 / apartment / rescue`, `seed 18 / restaurant / rescue`, and `seed 23 / townhouse / rescue`, a civilian spent a large portion of the 20-second sample frozen after startle. This **may be intended** prior to interaction; inspect visible identification, SECURE/FOLLOW, willingness to move, physical escort to extraction, and 2D/3D cues in complete player-authored sessions. Five civilian-bearing scenarios remained in routine, which is acceptable if sound was not actually perceived.

### P5 — a better human-choice baseline is still needed

The existing mode probe cannot evaluate a true Unknown-objective room search, multi-door insertion selection, mid-run replanning, or actual mission success/extraction. Next evaluation should explicitly author legal exploratory room sweeps in the two intel modes (same site, separate player-knowledge-authorized orders) and test whole missions on real browsers/phones. Do not infer subjective *interesting choices* from only first-shot time or average entrance count.

## Prioritized follow-on (no new general AI)

1. **Fix only proven squeeze-only final drag landings against known FRONT frames**, repro 20/26 and matched physical regression. The normal closed-door motor opening must not be expanded.
2. **Improve prepared mission placement** for the exact defensively empty Retail HOLD / Warehouse INTEL/RESCUE cases if legal positions exist. Retain legitimate quiet cases.
3. **Polish civilian command/readability** following full rescue interaction QA, not by new intelligence or auto-compliance.
4. **Assess room cover and choice quality** under rendered player-controlled missions with real fog. Optimize existing placement, not arbitrary clutter.

**Release discipline:** all EQA0 changes are read-only workflow/documentation on an unmerged audit branch. This report does not assert any gameplay defect was fixed or deployed. Any subsequent gameplay patch requires isolated feature branch, focused tests, physical/fog parity, and an explicitly approved merge/release checkpoint.
