/** Build 179: a single non-blocking environmental contact query for the
 * visible barrel and shot-time ballistics. Never moves an actor or changes
 * locomotion: the operator manipulates the gun, not their collision capsule.
 * Sweep the *rigid physical barrel tip* from the chest/body reference,
 * using the same height-aware walls, open leaves and cover as ballistics.
 */
import {COVER,WALLS,type Door,type Obstacle,type Segment,
  type Pt} from './breach-core.ts';
import {assessFireLane,type FireBlock} from './breach-fire-safety.ts';
import {muzzleAtShot,type MuzzleInput,type MuzzleSample}
  from './breach-muzzle.ts';
export type ClearanceResult={
  obstruction:boolean;blocked:boolean;retraction:number;
  blocker:FireBlock;muzzle:MuzzleSample;
};
/** 3.4 is the maximum valid underarm retraction supported by fitWeaponPose.
 * Never retract the barrel beyond that rigid hand/stock solution. */
const RETRACTION_STEPS=[0,1.15,2.35,3.4] as const;
/** Returns the first viable rigid gun fit, never an ad hoc muzzle clamp.
 * All fits use the same weapon stock, grip, transform and barrel axis.
 * A blocked final result suppresses shooting rather than moving bullets
 * through the wall or getting the operator stuck in a doorway.
 */
export function weaponClearance(input:MuzzleInput,
  doors:readonly Door[],cover:readonly Obstacle[]=COVER,
  walls:readonly Segment[]=WALLS):ClearanceResult{
  const from:Pt={x:input.x,y:input.z};
  const check=(muzzle:MuzzleSample):FireBlock=>
    assessFireLane(from,muzzle.y,{x:muzzle.x,y:muzzle.z},
      muzzle.y,cover,walls,doors,[],'weapon').blocker;
  const ready=muzzleAtShot({...input,obstruction:false,
    clearanceRetraction:0});
  let blocker=check(ready);
  if(blocker==='clear')return {obstruction:false,blocked:false,
    retraction:0,blocker,muzzle:ready};
  let candidate=ready;
  for(const retraction of RETRACTION_STEPS){
    candidate=muzzleAtShot({...input,obstruction:true,
      clearanceRetraction:retraction});
    blocker=check(candidate);
    if(blocker==='clear')return {obstruction:true,blocked:false,
      retraction,blocker,muzzle:candidate};
  }
  return {obstruction:true,blocked:true,
    retraction:RETRACTION_STEPS[RETRACTION_STEPS.length-1],
    blocker,muzzle:candidate};
}
