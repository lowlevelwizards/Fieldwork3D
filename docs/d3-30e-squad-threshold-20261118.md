# D3.30E — stable group interruption on a generated threshold

A terminally blocked generated entry now holds group continuity after a witnessed teammate failure. The subsequent **generated zero-duration WAIT + immediately linked ENTRY MOVE** of the same side/door is truthfully cancelled with a preserved coordinated retry snapshot, even if the door later opens without player action. No cancelled order counts as a successful arrival. Unrelated authored MOVE/WAIT/WATCH/LOOK and other thresholds remain untouched.

Uses the existing per-operator `interruptedDoorPlan` and `failCurrentOrder` rather than a second queue or motor coordinator. The helper checks only *already recorded* failed teammate plans and the current generated threshold ID; it never inspects hidden world state, reopens, reroutes or moves the actor. A coordinated interruption is eligible for the existing explicit player RESUME command only after its own physical gate is clear, and never resumes itself.

Focused tests cover later unlock, same-door identity, manual WAIT parity, unrelated authored MOVE isolation and immediate generated gate linking. Physical 11/22 map validation remains a release checkpoint, not a per-commit requirement.
