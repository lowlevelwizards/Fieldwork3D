/** D2.2: fixed-tick, call-local shot preflight. No Session or RAF cache.
 * A centered, settled sight clearance may be handed to the synchronous
 * shot resolver ONLY when every physical input and world reference matches.
 * Actual randomized shot yaw and full-length ally/civilian safety are never
 * supplied by or authorized by this preview.
 */
import {weaponClearance,type ClearanceResult} from './breach-weapon-clearance.ts';
import {assessFireLane,assessFriendlyLane,type FireLane}
 from './breach-fire-safety.ts';
import type {MuzzleInput} from './breach-muzzle.ts';
import type {Door,Obstacle,Segment,Pt} from './breach-core.ts';
import type {FriendlySafetyBody} from './breach-friendly-safety-volume.ts';

export type ShotSightPreflight={
 readonly input:MuzzleInput;
 readonly doors:readonly Door[];
 readonly cover:readonly Obstacle[];
 readonly walls:readonly Segment[];
 readonly friends:readonly FriendlySafetyBody[];
 readonly clearance:ClearanceResult;
};
export function prepareShotSight(input:MuzzleInput,doors:readonly Door[],
 cover:readonly Obstacle[],walls:readonly Segment[],
 friends:readonly FriendlySafetyBody[]):ShotSightPreflight{
 return {input,doors,cover,walls,friends,
  clearance:weaponClearance(input,doors,cover,walls,friends)};
}
/** For the ordinary synchronous handoff this avoids one full bounded
 * clearance solve. If any pose, weapon, target range or world input differs,
 * a new solve is required. No probabilistic post-spread checks are skipped.
 */
export function matchingShotSight(preflight:ShotSightPreflight|undefined,
 input:MuzzleInput,doors:readonly Door[],cover:readonly Obstacle[],
 walls:readonly Segment[],friends:readonly FriendlySafetyBody[]
 ):ClearanceResult|null{
 if(!preflight||preflight.doors!==doors||preflight.cover!==cover||
    preflight.walls!==walls||preflight.friends!==friends)return null;
 const p=preflight.input;
 return p.x===input.x&&p.z===input.z&&
  p.heading===input.heading&&p.weaponYaw===input.weaponYaw&&
  p.shoulderOffset===input.shoulderOffset&&
  p.weapon===input.weapon&&
  p.weaponConfiguration===input.weaponConfiguration&&
  p.equipment===input.equipment&&p.aim===input.aim&&
  p.posture===input.posture&&
  p.coverStanceDrop===input.coverStanceDrop&&
  p.velocity===input.velocity&&p.recoil===input.recoil&&
  p.threatRange===input.threatRange&&
  p.obstruction===input.obstruction&&
  p.friendlyNear===input.friendlyNear&&
  p.friendlyAhead===input.friendlyAhead&&
  p.clearanceRetraction===input.clearanceRetraction&&
  p.shortCompression===input.shortCompression&&
  p.shortFrom===input.shortFrom&&
  p.handlingIntent===input.handlingIntent&&
  p.carryOverride===input.carryOverride&&
  p.carryBlend===input.carryBlend&&
  p.shoulderPullback===input.shoulderPullback?
  preflight.clearance:null;
}
/** One near-target policy for candidate selection and shot preflight.
 * Check known teammates BEFORE testing penetrable cover: walls/cover must
 * never conceal an ally veto. The final stochastic trajectory is separate.
 */
export function nearShotLane(from:Pt,muzzleHeight:number,to:Pt,
 targetHeight:number,cover:readonly Obstacle[],walls:readonly Segment[],
 doors:readonly Door[],friends:readonly FriendlySafetyBody[]):FireLane{
 const allied=assessFriendlyLane(from,muzzleHeight,to,targetHeight,friends);
 return allied.blocker==='friendly'?allied:
  assessFireLane(from,muzzleHeight,to,targetHeight,
   cover,walls,doors,friends);
}
