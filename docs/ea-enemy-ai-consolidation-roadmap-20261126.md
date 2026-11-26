# EA — Enemy AI consolidation and living behavior
Base main: d5b195275c7311ef72dc7fac3adcdd33133d3e4b (2026-11-26).
Scope: game NPC behavior, shared simulation, no separate AI engine. Staged feature branch; release only at compatible verified checkpoints. No gameplay balance assumptions masquerading as measured results.

## Non-negotiable contracts
- Individual evidence only: confirmed sight, heard events, uncertain memories, received communications. No hidden player orders, coordinates or global combat knowledge.
- Physical motor, navigation, weapon clearance, civilian safety, ballistics, doors, custody and replay remain authoritative. No teleport, forced combat or extra actor clock.
- Preserve deterministic fixed-step reactions and authored blue-team orders. Keep quiet encounters possible. Distinguish combatant eligibility from health.
- Game difficulty comes from distinct NPC decisions and consistency, not health inflation or omniscient tracking. Separate competence, group purpose, personality, readiness and individual goals.
- Work budgets measure actual costly probes, not just top-level calls. Measure P50/P95/P99/max simulation tick cost separately from rendering. No unmeasured performance claim.

## Complete stage scope
| Stage | Deliverables | Acceptance |
| --- | --- | --- |
| EA0 | Inventory state writers, baseline scenario/seed manifest, read-only decision and CPU diagnostics, deterministic fingerprints and critical CI | Baseline captured before behavior changes; reproducible quiet/contact/search/custody episodes |
| EA1 | Single goal/destination ownership contract; separate evidence from task destination; explicit interruption/expiry; remove redundant writers; combatant eligibility and group boundaries | No stale evidence resetting active tasks; no invalid recipients; no oscillation/custody regression |
| EA2 | Allocation reductions, reusable actor and geometry context, deterministic bounded work, actual route/position probe counters, revision-safe caches | Compare same-seed outcomes; lower or equal measured simulation cost; urgent reactions never throttled |
| EA3 | Shared semantic site index: room/zone/portal topology, static activity and observation anchors, interior/exterior connectivity; dynamic revision handling | Valid generated sites, no invalid geometry or hidden knowledge; no duplicate navigation engine |
| EA4 | Context-dependent NPC position scoring, reservations, stable goals, physical clearance validation and failure handling | No invalid destinations or repeated replans; distinct meaningful NPC occupancy |
| EA5 | Four competence profiles (untrained, experienced, trained, specialist), independent traits, group purpose and motivation, legacy save defaults; Dispatch/Warzone/Wasteland mapping | Distinct observable distributions, identical physical and evidence rules; no faction-skin coupling |
| EA6 | Persistent routine tasks, posts, contextual activity, multi-area patrol and dwell, interruption/resumption | Real navigable journeys, quiet behavior preserved, no loops or teleport |
| EA7 | Evidence-driven suspicion, investigation, bounded area search, shared inspected-area progress when communicated, eventual stand-down | No psychic pursuit or stale search loops; legitimate fresh evidence interrupts |
| EA8 | Persistent local group plans with assignments, acknowledgments, reassessment and expiry; accessible communication cues | Only eligible informed members participate; group disruption and late arrival handled |
| EA9 | General game-space relocation and alternative connected routes, changed topology and failed-goal recovery; varied encounter direction and location | Physical validation, evidence-limited decisions, bounded work, no scripted ambush requirement |
| EA10 | Human resolve, disengagement, injury, witnessed loss, surrender and escape/custody integration | No active behavior by incapacitated or surrendered actors; mission semantics preserved |
| EA11 | Existing rig and audio presentation for activity, suspicion, communication, commitment and surrender; replay-compatible state | Actual event-derived cues, no hidden intel disclosure or secondary animation clock |
| EA12 | AI Lab: seeded scenarios, pause/step, goal/evidence/route/assignment diagnostics and performance comparison | Developer-only; production gameplay unaffected by debug toggles |
| EA13 | Cross-mode integration, balance, removal of obsolete paths, final acceptance and documented release | Critical CI, fixed-seed comparison, rendered play validation, production checkpoint only when verified |

## Initial audit and priorities
The 647-line enemy decision controller combines perception intake, intent, posture, morale-driven movement, contact decisions, noise response, routine and reports. State writers also live in actor phase, reconciliation, firing correction and suspect lifecycle. Preserve evidence, physical authority and existing scheduler. Specifically audit contact vs search destination, duplicated withdrawal ownership, group recipient eligibility, cover candidate allocations, awareness sorting and route probe amplification. Existing EQA2/EQA3.3 reports are historical evidence, not fresh baseline measurements.

Initial release batches: EA0–EA2 foundation; EA3–EA5 spatial/profile foundation; EA6–EA9 living/group behavior; EA10–EA13 human presentation/validation. Stage completion means integrated code and appropriate tests, not merely a helper or document. Keep unverified changes off main; verify prior Pages deployment before production release. No claim of full implementation until the actual stages are complete.

## Rolling implementation checkpoint (2026-11-26)
Foundation exact-base evidence: run 45838022316, 16/16 focused tests, base and candidate real encounter audits passed, exact generated-world delta 0/15. Identity/environment checkpoint run 45839300946: 20/20 tests, exact world delta 0/15. Group task checkpoint b3bf5ba: focused CI success. The historical C11 gate compared an older architectural baseline, not EA's actual parent. Existing D3 movement acceptance remains a release blocker until exact-base attribution and movement owner resolution. No merge or public deployment claimed.

Runtime additions on the branch: shared semantic site anchors and portal graph, scene cache invalidation, shelter-vs-observe position scoring, independent NPC identities and ambient timing, route-validated patrol extension, resumable investigation work, checked-area memory and physically received inspection messages, stable task provenance, scheduled group position work and connected-area proposals, surrender/withdrawal cleanup, report-derived replay gesture, developer-only Enemy AI Lab. Further balancing and complete cross-mode rendered validation remain required; no claim that all roadmap acceptance criteria are met.
