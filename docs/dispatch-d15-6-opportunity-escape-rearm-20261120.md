# D15.6 — Opportunistic surrender, escape and actual weapon recovery

Status: feature branch, stacked on D15.5F PR #1899. Not a standalone production release.

## Design/authority
- Surrender remains a **living, unarmed, noncombatant** state until a real
  weapon transfer finishes; no `health=0`, instant shot, hidden AI spawner
  or invented handgun inventory.
- Only an **unrestrained** submitted red actor may attempt a breakout.
  Deterministic 5/7/10-second delays for aggressor/guard/cautious,
  suppression and cooldown gates, and actual nearby supervision (body,
  facing, and wall/door LOS) prevent invisible instant resistance.
- The opportunity engine is driven from the existing 60 Hz actor phase,
  never independently scheduled or driven by replay/rendering.
- Once preparation begins, **supervision or suppression interrupts** it,
  with no completed weapon transfer. A subsequent genuine GO-time
  restraint cancels the mode and unready secondary hand. Repeated blocked
  escape-route probing is cooldown-bounded.

## Physical modes
1. **Recover** own *specific* dropped firearm `releasedWeaponId`, but
   only if it still exists as `loose`, is really reachable and has not
   been secured. Recheck on every tick, then maintain hand contact for
   1.05 s. `status` moves to `retrieved` **once**; reissue the original
   gun identity, exact actual ammo and configuration. A dropped pistol
   retains its genuine issued full `SecondaryEquipment` including its
   previously carried magazine identities and remaining rounds. No
   ammo injection or placeholder gun is allowed.
2. **Concealed sidearm** only if an actual holstered pistol was issued,
   the suspect was not searched and the real rounds exist. Requires
   0.78 s of hand preparation **plus** the existing 0.68 s physical
   primary-to-pistol transition; only then restore combatant status.
   The originally released/secured primary stays on the floor, and
   the original Glock/ammunition enters the common 9mm shot resolver.
   `suspectRearmedSecondary` is the explicit red-only gate into that
   pipeline, never a broad license for all enemies to draw pistols.
3. **Flee** unarmed when there is no eligible gun/sidearm: choose a
   deterministic passable, line-swept destination from the suspect's
   own heading/experienced last contact, use the existing real actor
   motor, and stop without gaining combat authority if watched.
   A fallen or cuffed captive never chooses this branch.
- The modes prefer real reachable own loose firearm, then genuine
  holstered pistol, then unarmed flight. Secure/firearm ownership wins
  any same-tick race before a pickup commits.

## History, presentation and debrief
- Replay archives the optional opportunity mode, gun ID, goal and clocks,
  along with whether a secondary is *actually issued at this frame*.
  A missing issue flag in an old film preserves its original behavior;
  a new frame with `secondaryIssued=false` removes any future hand gun.
- Physical world gun status is already archived with replay, now including
  the retained full dropped pistol kit.
- Structured interaction event actions identify attempted escape,
  attempted gun recovery, actual rearm and actual pistol draw.
- 3D fleeing submits an upright walking pose while retaining actual
  surrender/noncombatant status until a real rearm.
- Surrender is not guaranteed to be permanent until restraints are
  actually applied: CAPTURE extraction must still physically escort
  a restrained living prisoner. Uncuffed escape cannot satisfy it.

## Focused acceptance
- Policy: restrained, supervised, recently surrendered and suppressed
  suspects cannot break out; a soldier looking away or behind a wall
  does not supervise magically.
- Counteractions: SECURE FIREARM and GO-time RESTRAIN beat any pending
  recovery or secondary draw; a watched gun hand never completes.
- One real primary pickup and exact ammunition; same pistol model,
  customized equipment and spare serials return after actual pickup.
- An actual searched / fully disarmed suspect can flee but never fire.
- The real red Glock shot consumes **9mm only**, not original carbine ammo.
- Replay seek: before/after surrender, pistol issue removal, actual
  retrieval, and old-frame fallbacks without future possession.
- Baseline: D15.2 surrender and D15.5 escort/transport, S5/S7/S8/S9
  secondary operation, M3/M4 motor, production TypeScript/Vite/Pages.

## Known deliberate hold
- This is the next **development build**, not an authorized production
  deployment while D15.5F screenshot/IK visual approval and D15.7
  medically truthful capture outcomes are outstanding.
- Physical unarmed flight and arms-up/run body presentation still need
  mobile 2D/3D review, especially once an unsearched pistol is drawn.
- No new target respawn, forced secondary for ordinary enemy AI, or
  free-form hostile pathfinding was introduced.
