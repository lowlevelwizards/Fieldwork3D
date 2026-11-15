# D3.14A — Prioritize genuine nonproductive movement in fifth blind cohort

Date: 2026-11-15. Base: released D3.13H4 SHA b655efdd79ff244e0ff3d9f681b50c6ef2e2d4e0, whose GitHub Pages deployment completed with public build-stamp verification.

## Corpus and findings

Use the actual archived paired fifth independent 22-map results from H4 run https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43684016071 . Each of 22 previously untested generated maps was simulated twice, 4 operators and 45 seconds per mode, 176 physical outcomes. H4 versus G2C baseline: physical arrivals 143→144; fully arrived squads 29→30; suspected loop summary 17→9; real A* searches 9809→6152; zero physics violations.

The classification is a **5-second-window heuristic**, not a claim that every flagged window remained an unresolved operator failure at 45 seconds. Some entry operators were flagged early while legally navigating a queue and **subsequently arrived**. Never optimize those transient early windows at the cost of true physical movement.

Three still-unresolved representative classes, chosen BEFORE this audit:

| Seed, mode, operator | Last known physical state | Evidence of nonprogress | Priority |
|---|---|---|---|
| 5532875 townhouse standard, generated ENTRY, Vale | ~ (298.7,457.2), goal (468,520.5), ~180.72 short; D9 clear-leaf / grab-and-hold, active squeeze | Repeated 5-second windows from t10 to t45; body displacement generally <7 but travel clock 50–77, continuous squeeze and disposable nav alternating (296,496) / empty | P0 persistent doorway squeeze/route-ownership churn |
| 5386234 townhouse small, authored MOVE, Rook | ~ (493.5,511.2), goal (133.3,339.5), ~399.02 short; FRONT approach / grab-and-hold | t20, t35, t40, t45 loop windows, travel ~242 each 5s but net 5–9 | P1 persistent far-goal oscillation with long-standing doorway ownership |
| 5412896 retail small, authored MOVE, Rook | ~ (268.7,366), goal (128.4,313.5), ~158.95 short; D2 approach / outside-leaf | t20/t35 loops, travel ~244 each 5s but net <8; transient nav repeatedly near (272,400)/(269,359) | P2 stale rehearsed outside-leaf stage |

These positions, goals, door phases and distances came from the actual raw frozen H4 22-map candidate artifact, not handpicked design estimates.

## Diagnostic action

New read-only workflow executes exactly those three historical seeds, 60Hz real simulation for 45s in both normal authored and generated ENTRY modes. Source attribution is bounded to the actor specified in the audit flags. Capture per-actor route writers, repeated escape/reacquisition, rejection reasons, every five-second progress window, door episode, squeeze status, actual plan status, and physics safety. No change to motor behavior, collision, map generation, order lifecycle, actor positions or replanning.

The next physical fix should address **only the proven route/episode handoff** and pass the released D3.13H4 88-operator 45-second baseline, plus paired previously unseen 22-map outcomes. Priority is genuine sustained non-progress, not an arbitrary failure to cross a huge map before 45s.

Do not reinstate the old failed remote OPEN reach gate PR #1431. H4 fixed future-door route progression, not remote OPEN authority; lawful reach needs a separate path-to-handle design and physically swept acceptance.
