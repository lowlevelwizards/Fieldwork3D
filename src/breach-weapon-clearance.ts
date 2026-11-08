/** Continuous, deterministic clearance of the actual rigid gun.
 * Approach distance starts folding the weapon BEFORE the muzzle touches a
 * wall. Live rendering and shot-time ballistics consume this same result.
 * Never moves the operator, changes a path or teleports muzzle geometry. */
import {COVER,WALLS,type Door,type Obstacle,type Segment,
  type Pt} from './breach-core.ts';
import {assessFireLane,type FireBlock} from './breach-fire-safety.ts';
import {muzzleAtShot,type MuzzleInput,type MuzzleSample}
  from './breach-muzzle.ts';
export type ClearanceResult={
  obstruction:boolean;blocked:boolean;retraction:number;
  /** 0..1 wall-proximity-driven rifle fold: same as visible short-stock. */
  compression:number;
  blocker:FireBlock;muzzle:MuzzleSample;
};
/** Lead distance gives the elbows room to fold before contact; the rear
 * margin finishes compression when the free muzzle would penetrate. */
export const SHORT_STOCK_APPROACH_LEAD=14;
export const SHORT_STOCK_REAR_MARGIN=7;
const MAX_LEGACY_RETRACTION=3.4;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Search the first blocker along the ACTUAL direction of the ready barrel,
 * including closed door leaves and height-aware furniture. This is bounded:
 * one long probe, five distance refinements only when something is near.
 * No per-frame state or unrecorded smoothing (replay seek stays pure).
 */
export function weaponClearance(input:MuzzleInput,
  doors:readonly Door[],cover:readonly Obstacle[]=COVER,
  walls:readonly Segment[]=WALLS):ClearanceResult{
  const from:Pt={x:input.x,y:input.z};
  const check=(tip:Pt,height:number):FireBlock=>
    assessFireLane(from,height,tip,height,cover,walls,doors,[],'weapon').blocker;
  const ready=muzzleAtShot({...input,obstruction:false,
    clearanceRetraction:0,shortCompression:undefined});
  const vx=ready.x-input.x,vy=ready.z-input.z;
  const barrel=Math.hypot(vx,vy);
  if(barrel<.001)return {obstruction:false,blocked:false,
    compression:0,retraction:0,blocker:'clear',muzzle:ready};
  const dx=vx/barrel,dy=vy/barrel;
  const horizon=barrel+SHORT_STOCK_APPROACH_LEAD;
  const at=(d:number):Pt=>({x:from.x+dx*d,y:from.y+dy*d});
  const horizonHit=check(at(horizon),ready.y);
  if(horizonHit==='clear')
    return {obstruction:false,blocked:false,compression:0,
      retraction:0,blocker:'clear',muzzle:ready};
  // Bracket the first obstructing point along the rigid barrel axis.
  // A constant 5 refinements keeps expensive material tests bounded.
  let low=0,high=horizon;
  for(let i=0;i<5;i++){
    const middle=(low+high)*.5;
    if(check(at(middle),ready.y)==='clear')low=middle;
    else high=middle;
  }
  const distanceToObstacle=high;
  const start=barrel+SHORT_STOCK_APPROACH_LEAD;
  const total=SHORT_STOCK_APPROACH_LEAD+SHORT_STOCK_REAR_MARGIN;
  const proximity=clamp((start-distanceToObstacle)/total);
  // A very far contact inside the approximation tolerance is not a pose
  // change. Once contact approaches, progress changes continuously rather
  // than jumping from one discrete 1.15-unit slide to another.
  if(proximity<=.001)
    return {obstruction:false,blocked:false,compression:0,
      retraction:0,blocker:'clear',muzzle:ready};
  const folded=(compression:number)=>{
    const muzzle=muzzleAtShot({...input,obstruction:true,
      shortCompression:compression,clearanceRetraction:0});
    return {muzzle,blocker:check({x:muzzle.x,y:muzzle.z},muzzle.y)};
  };
  // Even a fully tucked barrel must never be allowed to ignite when a
  // solid obstruction is immediately in front of the operator's body.
  // Without this floor, deeply tucked guns can sit behind a near wall and
  // their muzzle-only probe incorrectly reports an unrestricted shot.
  const MIN_OPERATOR_FIRE_CLEARANCE=18;
  if(distanceToObstacle<=MIN_OPERATOR_FIRE_CLEARANCE){
    const full=folded(1);
    return {obstruction:true,blocked:true,compression:1,
      retraction:MAX_LEGACY_RETRACTION,blocker:
        full.blocker==='clear'?horizonHit:full.blocker,muzzle:full.muzzle};
  }
  const comfortable=folded(proximity);
  if(comfortable.blocker==='clear')
    return {obstruction:true,blocked:false,compression:proximity,
      retraction:proximity*MAX_LEGACY_RETRACTION,
      blocker:'clear',muzzle:comfortable.muzzle};
  // If the comfortable pose still hits the wall, find the *least* extra
  // compression that clears it. Stepped .12/.28/.48 jumps caused another
  // visible short-stock pop, even though the initial approach was smooth.
  const full=folded(1);
  if(full.blocker!=='clear')
    return {obstruction:true,blocked:true,compression:1,
      retraction:MAX_LEGACY_RETRACTION,
      blocker:full.blocker,muzzle:full.muzzle};
  let min=proximity,max=1;
  let best=full.muzzle;
  for(let i=0;i<5;i++){
    const middle=(min+max)*.5;
    const attempt=folded(middle);
    if(attempt.blocker==='clear'){max=middle;best=attempt.muzzle;}
    else min=middle;
  }
  return {obstruction:true,blocked:false,compression:max,
    retraction:max*MAX_LEGACY_RETRACTION,
    blocker:'clear',muzzle:best};
}
