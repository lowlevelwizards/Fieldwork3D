# Phase A — A6 integrated encounter acceptance (release 3)

This release checkpoint verifies a *combination* of the previously merged mechanics; it does not add autonomous squad tactics, change health/reload balance, or introduce new animation layers.

## Release history and boundary

- **R1 / A0–A2:** baseline and authority contract, rotated door stack geometry, planning-only known geometry, and explicit player WATCH handoff. Main release `c8796aab` verified by Pages.
- **R2 / A3–A4:** actual-shot suppression evidence and defender HOLD/cover continuity, without new player movement interruptions. Main release `b56ba238`.
- **R3 / A5–A6:** latest recorded muzzle event for visual burst timing and critical cross-system acceptance. Keep on branch until previous Pages deployment completed and served the exact stamped build.

## Critical automated go/no-go matrix

| System | Actual gate | Required behavior |
| --- | --- | --- |
| Explicit player authorship | `squad-entry-b-continuity` | Custom WATCH survives generated entry through arrival, correct physical sector handoff, undo/redo transaction safe |
| Doorway motion | `doorway-convoy-flow` | Four operators cross actual threshold with physical clearance and progress; no forced overlap |
| Enemy decision safety | `mission-reactivity-r8b`, `phase-a-ai-hold-cover` | Pressure-driven HOLD does not force offensive reposition or clear a committed defense repeatedly |
| Shot truth and friendly safety | `tactical-integration-17-firefight-b1`, `phase-a-shot-pressure` | Fire lane stays authoritative; missing/occluded projectiles cannot generate direct target suppression |
| Combat presentation | `tactical-integration-18-firefight-b2`, `phase-a-combat-cues` | Shot and impact cues derive only from actual recorded events; rapid overlapping bursts show freshest visible flash |
| Replay | `replay-r44-real-session` | Actual recorded squad crossings, no inferred or fabricated movement events |
| Real-world generated entry | `audit-squad-entry-b` | Door swing obstruction stays blocked; passable four-person entries finish without silently changing orders |
| Type/build | `npm run build` | Typecheck and production bundle succeed |
| Phone performance | performance workflow + manual device | No new critical active-frame regression; actual iPhone sustained gameplay remains a required manual check |

## Manual acceptance remains explicitly outstanding

This repository check cannot prove how the game *feels* on a particular phone. Review a full four-person operation on real iOS Safari: approach, stack, door opening, first contact, actual fire, suppression, a casualty/withdrawal, and replay. Verify no new excessive flinches, broken hands/elbows, unnecessary forced stops, unreadable muzzle cues, camera confusion, leaked fog intel, or persistent stutter. Do not claim subjective visual approval from CI alone.

## Scope decisions

- No anatomical per-limb injury penalties: wound regions are still coarse deterministic assignments, not full ballistic hitboxes.
- No new 60 Hz enemy planner, extra local movement authority, civilian rule rewrite, or automatic tactical pause.
- No extra glowing rim lighting, weapon gloss, screen shake, or high-density particle layer. Follow the established graphic/cel-shading style.
- No new UI menu items, duplicated labs, or additional user-facing controls for Phase A.
- Do not use a scripted casualty/surrender outcome as the criterion for normal emergent encounters.

If the focused gates fail, fix the actual blocker on this feature branch. Do not move this release into `main` or start another Pages deployment until the preceding deployment is confirmed successful and serving the correct build.
