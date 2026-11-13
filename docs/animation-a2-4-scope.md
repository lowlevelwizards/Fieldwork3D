# Animation A2.4 — Weapon posture, triggers and near-body clearance

## Real-world pose evidence / visual semantics
U.S. Army TC 3-22.9 Rifle and Carbine chapter 6: low ready with buttstock seated, muzzle depressed roughly 30–45°, upright head and eyes over the sights; high ready buttstock under firing-side armpit, muzzle elevated ≥45° in a safe sector, not across teammates. These are reference principles, adapted to the game's exaggerated stylized geometry, not a combat training document.
References:
- https://upload.wikimedia.org/wikipedia/commons/4/43/TC_3-22.9_Rifle_and_Carbine_May_2016_%28Change_1%2C_tc3_22x9wc1%29.pdf
- https://www.swatmag.com/article/assume-the-position-ready-positions-for-the-real-world/
- https://www.thefirearmblog.com/blog/2020/05/20/rifle-sling-positions-ready-positions/

## A2.4.0 Audit / acceptance
Audit six styles `low, high, ready, point, ads, short` across all modular weapon family presets plus classic platforms; head/chest alignment, stock pocket, barrel elevation, both grip sockets, hand/elbow reach, stance and clearances. Compare angle signs, named trigger conditions, monotonic progression and rendering vs shot-time fitting. Reuse actual mobile+desktop Operator Lab gallery and deterministic pose reports. Never silently swap an infeasible silhouette.

## A2.4.1 Authored silhouettes
- **Low:** shoulder-seated rifle, muzzle noticeably low, upright scanning head, elbows comfortable, both hands on proper sockets.
- **High:** muzzle elevated, buttstock tucked to firing-side armpit/underarm instead of shoulder/ADS. Distinct two-hand support and balanced elbows; avoid head/helmet collisions.
- **Ready:** shouldered, muzzle slightly depressed, both hands engaged, immediate aim transition.
- **Point / ADS:** forward sight orientation and stock contact; point = close-ready, ADS = optic/eye alignment. Never alter authoritative firing vectors.
- **Short:** retain the exact pre-approved full M4A1/AKM authored endpoint and transfer pose to all weapon families, not an animated stock teleport.

## A2.4.2 Explicit trigger / priority matrix
Pure shared selector with documented precedence and reason: equipment interaction/reload/treat/run; active threat / aim; standing watch/pie; approaching door/threshold / entering; stacking with friendlies, passing a friendly, retreating and nearby clearance; calm movement/idle. Preserve manual lab overrides. Reconcile display and clearance probe/shot-time carry from the same handling intent and stored motor facts. Never use arbitrary render-time pose history for replay.

## A2.4.3 Progressive compression
Distance/length driven **ready → low ready → compressed low → underarm short-stock** as clearance decreases, using deterministic bands for walls/door leaves/thresholds; neighboring operators impose additional no-flag courtesy compression when barrel axis intersects their body space. Clearance chooses a compact pose early enough to keep the physical barrel out of walls, with a separate hard blocked state if no feasible pose can avoid a near-collision. Keep all hand/stock attachments on the same rigid weapon transform; preserve the ballistics safety policy. No clipping should be *claimed* until actual geometry-based tests pass; blocked contacts must be reported honestly.

## A2.4.4 Replay, interactions and optimization
Test exact deterministic same-time pose/clearance, all weapon length families, mirror contacts, friendlies ahead/stacked, thresholds/open/closed doors, wall distances, cancellation/interruptions, reload/throw/door hand ownership, and no extra render frame update/physics tick. Keep the clearance query bounded and allocation-aware. Fire only via existing shot permission and projectile origin logic; display is not permission to shoot.

## A2.4.5 Release
Stage commits on feature branch, critical relevant tests + production build + real phone/desktop WebGL gallery + QA data artifacts. One merge when all green and previous Pages release verified; verify exact deployed main SHA on public Pages before closeout.

## Deferred
Full 3D swept weapon mesh and arm/gear intersection against arbitrary moving actors and furniture beyond existing authoritative 2D/height-aware geometry; no hard guarantee for all complex scene configurations until those tests exist. A2.5 handling choreography and other action animations remain separate.
