# Dispatch D10 — Force accountability / evidence review

D10.0 source audit, 2026-11-16:
- Authoritative hits: `breach-shot-resolution.ts` records `CivilianHarmEvent`
  with shot ID, timestamp, victim ID, shooter, side, before/after
  condition and physical position. A deduplicated blue-only aggregate
  already applies the precise standard civilian-harm score penalty.
- Spoken challenge in D9 emits an interaction battle event, and surrender
  emits a surrender event. Refusal was only a transient notification:
  D10 will add structured actor/target evidence; no gameplay outcome change.
- `debrief(Session)` assesses true session state. Structured After Action
  mission details and campaign chronicle already have room for concise,
  read-only accountability. Historical `CampaignReport` allows optional
  fields, but old reports must remain valid. Campaign settlement is
  idempotent via appliedResults.
- Current shot resolver rejects known-civilian fire lanes, protects friendlies,
  and prevents shooting already-surrendered targets. No reliable per-shot
  *legal justification* or officer intent evidence exists; it is dishonest
  to label all hostile shots lawful or unlawful from target identity alone.

D10 stages:
D10.1: central pure, evidence-only assessment with per-shot blue-attributed
civilian injuries/incapacitations, third-party separation, unique victim
counts, traceable operator IDs and timestamps, explicit evidence limits.
D10.2: structured CHALLENGE / REFUSAL / SURRENDER source/target battle-event
metadata, persisted in existing mission film. No coercion, new ROE triggers,
extra RNG, or hidden-contact leaks.
D10.3: debrief and compact Dispatch Mission Details evidence review, clear
separation of *confirmed harm* from formal legal determinations. No second
score penalty, no generic moral grade.
D10.4: optional versioned compact history snapshot stored on a Dispatch
`CampaignReport`, validated on save import, surfaced in chronicle. No
additional rewards/reputation/discipline or backfilled legacy history.
D10.5: tests for shooter attribution, duplicate shots, mixed offender sides,
historical parity, event identity, career idempotency, focused CI and one
production release gate after previous verified Pages build.

Deferred: actual ROE policy profiles, warning escalation timers, force
authorization rules, legal investigation mechanics, suspension/discipline,
court procedures, department reputation and altered hostile detection.
