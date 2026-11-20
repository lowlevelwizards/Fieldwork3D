# D15.7 — Medically truthful capture, fatality and extraction

Base: D15.6 feature branch (`feature/d15-6-opportunistic-escape-rearm-20261120`), stacked upon D15.5E/F. No standalone production release.

## Authoritative meaning

- `health > 0` = still upright/conscious in the existing combat motor, not inherently surrendered or secured.
- `health <= 0` = incapacitated/no movement; **never proof of death**.
- A **real** fixed-tick shooting down or medical-deterioration down records
  `downedAt`, with the first down timestamp preserved. A shot also retains
  `lastDownById` for eventual verified fatal attribution.
- Bleeding persists while a physically downed actor remains untreated.
  Gameplay blood-loss thresholds 1/2/3 still raise injury stages; terminal
  loss at 4 is a **separate, explicit, irreversible** `deathAt` record.
  No instant weapon-based death roll or `health=0` mortality shortcut.
- A downed patient with active un-stabilized bleeding is **critical**;
  with real stabilized wounds **stabilized**; with no active hemorrhage or
  treatment **incapacitated**. An old film or manually zeroed actor with
  no down evidence is **unverified**. A recorded fatality is **deceased**.
  Real existing `MedicalCondition` wound records and medical inventory
  are the only care/bleeding data. These are gameplay classifications,
  not clinical medical guidance.
- Death stops custody and any escape, and may add a fatality/kill *once* at
  the real death tick, credited to the original final downing shooter when
  recorded. An incapacitation alone awards **no fatal kill**.

## Objective and custody rules

- CAPTURE may proceed when the named target is subdued (living surrender,
  real incapacitation, or an historical unverified casualty), but the mission
  can only secure/extract a **living** target. There is no remote conversion
  of death into an arrest.
- An unverified downed historic body requires an **uninterrupted 0.9-second
  close, physically swept vital check** at the original target location
  before the mission can assert `captureSecured`. Movement away resets
  the timer. The check records an actual mission interaction and down
  evidence; it does not create a wound or invent a death.
- A known down requires the existing real operator contact to secure,
  and the exact physical drag/carry or reciprocal live escort at extraction.
  A deceased target cannot be newly picked up for CAPTURE or treated.
- If a target dies **while physically known/secured or observed at close
  contact**, the mission becomes failure with a real target-deceased event.
  Death out of sight does **not** immediately broadcast the target's
  hidden position or medical fate through fog.
- The existing TREAT action now considers only a **disclosed, reachable,
  downed, designated red CAPTURE target**, as well as the ordinary squad.
  Treatment requires issued real dressings and a GO-time physical
  approach/hand orientation; no across-wall care, no item duplication,
  no resurrection, and no revival of 0 HP on wound stabilization.
- Treatment is preventative: stabilizing all active wounds stops fatal
  blood loss. It does not change the original casualty's damage history.

## Replay, UI and assessment

- `downedAt`, `deathAt`, `lastDownById` are optional new film fields:
  playback and reverse seek restore true event state, while archived
  missing values stay `null` and are interpreted as **unverified**.
- Mission text now explicitly requires a living target at extraction.
- After Action Mission Details gets CAPTURE TARGET · MEDICAL OUTCOME with
  vital category, physical secured status, recorded death timestamp
  and completion disposition. These are retrospective authoritative
  final states, not undisclosed tactical live information.
- Scoring adds a transparent +5 for stabilized captured patients, or
  -8 for a critically injured but live extracted target; unrelated
  mission/civilian scoring remains as before. A recorded death is
  never a successful capture.
- `kills` and `s.deaths` change only on actual recorded fatality,
  not merely on incapacitation.

## Focused acceptance / gates

1. Exact down and critical condition, followed by stabilized and
   irreversible fatal death when actual blood loss continues.
2. Death cannot double-count; no fatal information leaks through fog.
3. Confirmed fatality cannot extract successfully; no phantom custody.
4. Legacy unverified captive requires uninterrupted physical assessment.
5. Blue team can use the existing authored, timed, inventoried TREAT on
   a visible designated red target, including securing the wound before
   its fatal threshold; neither unrelated hostile nor deceased body
   gets cross-side treatment.
6. Rewind/seek across live down, stabilized, fatal and old film records.
7. D15.5E/F physical carry, D15.6 escape/9mm, legacy D15 capture and
   medical tests, M3/M4/pose tests and production TypeScript/Pages build.

## Release hold

This is a **feature checkpoint**, not production. It is stacked on D15.5E/F
(PR #1899) and D15.6 (PR #1901). Validate actual 2D/3D death/hand contact
and medical palette usability, reconcile safely with main, and avoid
redundant merges into a running Pages deployment. There is no assertion
that a purely automated test proves a perfect rendered casualty carry.
