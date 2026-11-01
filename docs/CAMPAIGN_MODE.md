# Fieldwork Persistent Campaign — Player Guide

The tactical sandbox remains accessible through **Quick Play**. Campaign has a separate save.

## Playing a campaign

1. Choose **New Campaign** or **Continue Campaign** at launch.
2. Review the operations room: four deployed careers, reserves, available contracts, supplies and funds.
3. Hire a recruit or change an assignment in the four tactical-slot selectors. Recruits have permanent careers even when they occupy a slot originally named Rook, Moss, Ash or Vale.
4. Pick a contract and deploy. The site seed and objective belong to that contract, not to the Quick Play random-site selector.
5. After completing or failing the mission, review operator outcomes, proficiency growth and significant events; return to the operations room.
6. Heal injured personnel, replenish ammo from finite stock, buy equipment, and accept another contract.

## Save behavior

Campaign state uses versioned local browser storage and can be exported and imported as JSON. **Export your save before clearing site data.** Accepted contracts survive a browser restart, but reopening an interrupted tactical encounter returns to planning; in-progress orders and frame-exact combat are not checkpointed yet. A committed operation result can only be awarded once.

## Career rules

Shooting skills directly affect the tactical engine's existing handling, recoil and dispersion calculations. Practice gains are bounded per operation. Traits represent individual learning aptitudes. Service distinctions, memories and shared deployment history are based on actual recorded events.

Wounds require recovery and may be treated with limited medical supplies. Operators may be retired voluntarily; retirement does not assert a combat fatality. Automatic permanent death is deliberately not enabled because the current tactical simulation cannot yet reliably distinguish downed, evacuated and confirmed-killed states.

## Scope and safeguards

No strategic simulation runs in the tactical 60 Hz loop. The campaign overlay avoids tactical render work. Quick Play never awards campaign resources or progression. The campaign and tactical sandbox continue to use the same underlying mission objectives, world generation, combat and replay systems.
