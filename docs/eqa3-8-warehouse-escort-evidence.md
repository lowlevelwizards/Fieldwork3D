# EQA3.8 — Warehouse 17 rescue follower blocked by friendly insertion squad

## Actual causal baseline (unmodified game)

[110-second 60 Hz physical scenario CI #44454361593](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44454361593) **passed**, with JSON traces in the `eqa3-8-warehouse17-real-escort-110s` artifact. Original EQA3.6 mission script, no teleport, no scripted civilian manipulation, real FRONT/SERVICE insertions and real UNKNOWN/CONFIRMED intelligence.

- Seed17 RESCUE / UNKNOWN FRONT: ROOK securely handed off the wounded rescue civilian at ~39s, followed toward real extraction (502,253.63). ROOK reached (497.5,253.64), 4.5 units from exit. Person moved normally until **(449.45,253.73)**, exactly **52.55 units** from extraction, and remained there from approximately 70s to 110s. FOLLOW ownership stayed ROOK, the person retained health 1, and a real next movement goal (474.5,253.68) repeatedly triggered bounded retries. No missing order, no loss of custody, no collision with a closed door there. Mission was still in `extract` after 110s.
- The initial blue squad were physically stationed at **(459,235.63)** and **(459,271.63)**. At the civilian's stalled point, the two teammates' own 20-unit crowd envelopes leave a corridor that a 20-unit avoidance step cannot traverse.
- `src/breach-movement-authority.ts` **already explicitly exempts blue–neutral pairs from hard collision** because these units are intended to be soft cooperative traffic. However, `src/breach-simulation-motion-phase.ts` builds an `occupied()` precheck that treats **every** living operator as a hard civilian obstacle. The escorted civilian consequently stops and retries at the untouched friendly insertion squad, before the shared movement arbiter has a chance to apply its existing soft-traffic rule.
- UNKNOWN SERVICE does not reach the rescue target by 110s (different objective/search issue). CONFIRMED FRONT and SERVICE both incapacitate the civilian under actual enemy fire before FOLLOW; do not misreport these as blocked escort navigation.

## Narrow correction (feature branch)

Introduce `escortUsesFriendlySoftTraffic()`: **only living civilians with active `state='escorted'` and `following`** skip the preliminary 20-unit occupancy rejection against **blue** operators. Other neutral people still avoid crowding; red hostile and neutral civilian contacts remain hard. Every wall/door/cover swept clearance remains unchanged. The shared 60 Hz movement arbiter keeps its existing blue–neutral soft-traffic policy; no teleport, invulnerability, invisible escort, forced FOLLOW, or mission auto-completion.

This is narrower than globally allowing civilians to pass through everybody. It addresses a witnessed, deterministic failure with the game physics instead of increasing follower speed or relocating the extraction marker.

## Verification contract

- Deterministic direct replay of the **exact** stuck world coordinates in an actual Warehouse17 60 Hz Session, with unchanged squad spawn positions. Assert bodily progress across the two idle blue teammates **and** true rescue mission `done` at the actual extraction point, not synthetic success.
- Focused prior EQA3.1 escort, civilian B3/R2 locomotion, D1 rescue lifecycle, and TypeScript validation.
- Full 110-second UNKNOWN/CONFIRMED × FRONT/SERVICE audit after the correction: compare original UNKNOWN FRONT 52.55-unit stall to the new real finish time; preserve non-FOLLOW outcomes and allow risky encounters to remain risky.
- Keep PR in draft until CI proves the causal fix; no merge onto `main` before full green verification, and check latest Pages deployment state before a production release.
