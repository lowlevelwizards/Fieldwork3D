# R7: Ballistic Cover, Functional Furnishing, Prepared Defenders and Live QA
**Release checkpoints:** R7A–B, then R7C–D. Keep merges separate from passing
CI and public Pages verification, and never queue two production deployments.

## R7A — authoritative 2.5D cover
- Diagnose incoming shots from actual doors/pass-throughs, with the same
  cover-height ray test used in combat. Distinguish visual exposure, standing
  ballistic protection, crouch protection, and ability to fire back.
- Exclude walls masquerading as furniture cover; bounded 4×4 legal room cells.
- Map Lab reports the additional truthful metrics.

## R7B — natural tactical furnishing
- Rank at most five already-legal placements for *existing optional functional*
  desks, counters, shelving, etc. No props are conjured for better scores.
- Keep mandatory equipment, room uses, doorway reservations, density limits,
  actor clearance and both physical and optic engagement lanes intact.

## R7C — prepared defensive positioning
- For the prepared encounter profile, rank up to 22 sampled candidate sites
  by real cover and firing lane utility. Keep all other encounter profiles'
  ordinary civilian/workplace positioning.
- Defensive positions have to pass the existing standing, insertion, actor
  spacing, traversability and route checks. Angle selected guards toward
  nearby real thresholds. In-run repositioning uses actual directional
  crouched cover instead of merely geometric near-cover overlap.

## R7D — active simulated firefight QA
- Script real pre-GO player movement orders and run the authoritative motor,
  enemy AI and combat simulation across up to 11 seeded maps for 4–20 seconds.
- Record replay frames, movement, observed contact, real shot/wound/down
  events and event chronology. Missing contact is explicitly reported.
- This is a developer scripted probe, not a claim of a human playthrough or
  realistic tactical effectiveness. Follow with hands-on mobile playtests.

Critical gate commands:
```sh
npm run check
node --experimental-strip-types --test tests/mission-defender-r7c.test.mjs tests/mission-firefight-r7d.test.mjs tests/mission-cover-r7a.test.mjs tests/breach-defense-performance.test.mjs
npm run audit:r7-firefights -- 6
```
