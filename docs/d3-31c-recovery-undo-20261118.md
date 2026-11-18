# D3.31C — undo/redo preserves interrupted-entry recovery offers

Previously RESUME consumed the interruption after the authored edit. Undo
removed the resumed movement but did not restore the player's recovery offer.

Capture the prior interruption inside both the single-actor and atomic squad
planning transaction. Successful resume clears the saved incident within
the commit. Undo recovers the exact frozen original nodes, source order,
timestamp, physical door and approach side; redo consumes the offer again.
Failure rolls back plan, controls, witness, IDs and group history.

Archived sessions without the optional recovery history fields remain
supported. Normal door security and full body collision remain authoritative.
Focused regressions exercise solo undo, squad undo, redo, failed group retry
and branching away from redo after a renewed resume.
