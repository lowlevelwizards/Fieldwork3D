# D3.31A — physical approach provenance for interrupted threshold groups

**Purpose:** same physical door ID must not imply same stack or same entry direction. Two operators whose interrupted entry happened from opposite sides of the door need independent manual/squad recovery offers.

- Capture the normalized signed approach side at the authoritative cancellation time using witnessed door endpoints and operator position; never derive it from later movement or hidden lock state.
- Preserve this side through subsequent linked generated-WAIT/MOVE cancellation, without overriding the original snapshot.
- Filter `RESUME SQUAD` by matching recorded approach side, while maintaining compatibility for historical snapshots without side metadata and operators interrupted directly on the threshold plane.
- Preserve individual resume, stored goals, normal lock/jam/swing and full capsule checks. This change never moves a body or starts a door action.
- Critical test for opposite-side mixed entries, captured physical provenance, legacy snapshot compatibility and all-or-nothing recovery.

Stacked on H–I and intentionally excluded from the already-running A–G and H–I release checkpoints. Commit independently and validate with focused tests before scheduling any further deployment.
