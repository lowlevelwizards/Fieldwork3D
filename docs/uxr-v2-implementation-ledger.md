# UXR-00 — Operations Room baseline and non-regression contract

Status: staged implementation baseline (2026-11-20). Branch: `feature/uxr-v2-operations-foundation-20261120`.
Source: mobile screenshots of main menu, HQ, Squad, Cases, Supply and Records, plus live `src/campaign-ui.ts`, `src/campaign-style.css`, `src/ui/fieldwork-design.css` and existing acceptance tests.

## Primary usability defects
| Surface | Observed problem | Required first-view decision | Redesign rule |
| --- | --- | --- | --- |
| HQ | next case, readiness, three statistics, supply sentence and shortcuts repeat the same state | resume or choose next assignment, see blockers | one action, compact readiness strip, alerts only for actual issues |
| Squad | four assignment selects precede four duplicated deployed roster entries plus three reserves | identify and inspect four operators, replace a slot | selected deployment grid + compact reserves + one detail inspector; no repeated full roster |
| Cases | three tall repeated offer cards with reward/deadline/unknown intel repeated | compare and select a case | one active case with explicit previous/next, index, contextual review |
| Supply | five stocks, per-person refill table, five full-row purchases, then weapon procurement | what's needed and can HQ supply it? | stock strip, squad-needs quote, selected purchase, separate armory |
| Records | long operation cards followed by nested related-history prose and closeout paragraphs | scan chronological outcomes | compact archive + selected report, archive remains complete |

## Preserved authority and invariants
- `CampaignState`, save/import/export, Dispatch profile and campaign mode definitions remain authoritative.
- All mutations continue through the existing `CampaignHandlers`; never duplicate inventory or pricing calculations in views.
- Squad slot editing is blocked during accepted deployments; no lost/retired operator can be assigned.
- `quoteCampaignSquadRefill`, campaign purchases and weapon procurement enforce finite stock, capacity, funds and eligibility.
- `dispatchCaseDossier`, `campaignIncidentView`, `contractObjectiveIntel` and retained records control reported/known information; no speculative threat or case linkage.
- Reported/unconfirmed, recorded outcome, reviewed/unreviewed and unknown distinctions survive any compact presentation.
- Returning from case to Squad/Supply and back preserves selected case; no accidental acceptance.
- No new WebGL renderer per card, no continuous hidden previews, no simulation-loop UI work.
- Portrait fallback may be static and abstract until existing visual preview assets can be safely reused.
- On phones, primary actions must be discoverable without vertical list traversal, 44px touch targets, safe-area handling, accessible focus and reduced motion.

## Fixtures needed for targeted acceptance
1. New Dispatch career with four assigned operators and three available contracts.
2. Established career with eight operators, three recovering reserves, depleted ammo/medical, ten reports.
3. Accepted live deployment: assignment and constrained purchasing remain locked.
4. No eligible operator/no contracts/no spare HQ stock.
5. Classic/Sandbox/Dispatch state and save roundtrip.
6. Narrow portrait, typical portrait, short landscape, tablet, desktop; keyboard and touch.

## Critical existing test coverage
- `tests/operations-landing-navigation.test.mjs` contains structural expectations of the old four selects and stacked cards. Replace those with behavior assertions when changing structure; do not preserve obsolete markup merely to pass old tests.
- `scripts/smoke-operations-room-responsive.mjs` covers save reload, active deployment, resource purchase, responsive screenshots, keyboard and history lazy loading. Update affected selectors and assertions alongside the redesign.
- `tests/palette-cohesion-critical.test.mjs` guards existing shared UI theme and apparel/material palette independence.

## Staged rollout
UXR-00 baseline → UXR-01 three opt-in visual directions → UXR-02 presentation projections/primitives → UXR-03 compact HQ → UXR-04 visual Squad → UXR-05 focused Cases → UXR-06 Supply → UXR-07 Records → UXR-08–11 integrations, stylesheet cleanup, responsive acceptance, release QA.

Commits accumulate on this branch. Logical release checkpoints only; confirm prior Pages success and the publicly served SHA before main merges. No production deployment is implied by a branch commit.
