# Clearing C — weapon readiness, movement and firing contracts

## Design objective
An operator should *read* as deliberately clearing with a four-person team,
not as a permanently sighted first-person shooter. The visual weapon posture
follows what they are **already doing**, not a new autonomous order system.
Movement, player LOOK/WATCH, detection, hand contact, door hinges, and the
authoritative muzzle remain independent.

## Pose decision priority (highest first)

| Situation | Posture | Transition rule | Gameplay authority |
| --- | --- | --- | --- |
| Real muzzle obstruction or shoulder-first squeeze | **Short-stock** | Immediate, physical override; no aim hysteresis | Full-body door/cover geometry; squeeze prohibits firing |
| Sprint / run, active climb or vault | **Low ready** | Immediate even if previous aim meter remains high | Existing sprint/traversal shot veto |
| Reload or medical interaction | **Low ready** | Immediate; hand-action keyframes remain primary | Existing reload and treatment shot veto |
| Confirmed close threat and aim >= 0.34 | **Point shooting** | Immediate combat response | Original acquisition and shot-time muzzle |
| Acquired threat / active aim >= 0.82 at non-close range | **ADS** | Immediate combat response | Existing physical muzzle and firing readiness |
| Early contact / aim >= 0.20 | **Point shooting** | Immediate combat response | Actual muzzle and teammate veto |
| Stack, active door order or generated door wait, teammate directly ahead | **High ready** | Passive 0.16 s minimum dwell and 0.24 s visual blend | No shot permission implied |
| Generated room-entry move, teammate directly ahead | **High ready** | Same passive blend; maintain muzzle courtesy | Player's authored sector and threshold handoff |
| Stack, door or generated entry without forward teammate | **Ready** | Same passive blend; preserve original LOOK and sector heading | Existing plan / WATCH / hostile-contact priority |
| Player WATCH/LOOK, cautious hold or deliberate slow movement | **Ready** | Same passive blend | Look bearing remains player-authored |
| Ordinary fast walking / reposition / closely following a teammate | **Low ready** | Same passive blend | Existing motor and convoy right-of-way |
| Ordinary slow movement / stand without threat | **Ready** | Same passive blend | No implicit automatic aiming |

**Weapon-dependent close-contact thresholds:** shotgun 86, SMG 100,
carbine/rifle 74 world units; these are existing presentation thresholds, not
new detection radii. The rigid weapon family, magazine, stock, muzzle and both
grip contacts must remain those of the actual equipped weapon. Long rifles
retain the family-authored silhouettes—never substitute the MP5/carbine shape.

## Movement choreography

1. **Approach:** low-ready for purposeful forward travel; ready when creeping
   or watching an assigned direction. A teammate directly ahead may lower
   an ordinary moving gun. This is a *visual* muzzle-courtesy heuristic,
   not a physical firing-lane verdict.
2. **Stack:** ready when a sector is open; high-ready when a teammate is
   directly in the forward body/muzzle corridor. Do not lift every weapon
   because teammates happen to share a room.
3. **Door interaction / generated WAIT:** a high-ready choice may protect
   the teammate at the door. The hinge must actually open and physically
   clear before anyone crosses. Player-authored WAIT duration stays intact.
4. **Threshold passage:** true body squeeze or muzzle interference uses
   short-stock; passage leases and swept body motion still decide whether
   the step is legal.
5. **Room entry:** the generated entry look starts turning toward its
   assigned sector *only after physical shoulder clearance*. Use ready
   unless a teammate directly ahead calls for high-ready. This action
   does not insert waypoints or alter a manually authored WATCH.
6. **Contact acquired:** point shooting during the early aim rise and
   at close range; ADS after sustained aim for more distant targets.
   A run or full-handed traversal still cannot become an ADS firing pose.
7. **After contact / hold:** release into ready, or low-ready when moving
   away quickly. Passive hysteresis and blending suppress chattering.

## Authority and performance rules

- **Never shoot based on the visual posture.** Shot readiness, the actual
  rigid muzzle, projected trajectory, civilian safety, and teammate disks
  remain the *only* firing authority. The safety gate now tests the full
  muzzle-to-target segment against teammate bodies, including endpoint overlap.
- **No auto-pause, auto-repath, teammate shove, fixed room reveal or
  extra shot permission.** If a door physically cannot swing, the prior
  blocked-swing warning persists; do not ghost through the panel.
- **No new per-tick path solver or heavyweight IK.** Read the existing actor
  plan only; teammate-ahead presentation checks loop over the existing
  actor array without allocating temporary arrays.
- **Replay:** pure context classification and time-sampled transition.
  The look direction, motor pose and live body geometry remain authoritative;
  a presentation change must not rewrite a replay event.
- **Collision:** intentional mild visual mesh/armor overlap remains preferable
  to a complex physics solver if rigid stock/hand sockets are preserved.

## Validation / release

The focused gate includes the stance intent matrix, run vs aim priority,
squeeze/door context, passive hysteresis, all six rigid pose fits across the
existing weapon types, near-muzzle safety, live four-person entry and
legacy shooting/pose tests. The independent animation, physicality and
simulation-performance workflows apply as triggered by the changed files.
Keep PR #1009 as a draft for a later release batch, verify previous public
Pages build before merging, and review silhouette/readability on an actual
phone separately from Node-based acceptance.
