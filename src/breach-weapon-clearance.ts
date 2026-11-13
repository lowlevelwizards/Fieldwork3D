/** Continuous, deterministic clearance of the actual rigid gun.
 * Approach distance starts folding the weapon BEFORE the muzzle touches a
 * wall. Live rendering and shot-time ballistics consume this same result.
 * Never moves the operator, changes a path or teleports muzzle geometry. */
import {COVER,WALLS,type Door,type Obstacle,type Segment,
  type Pt} from './breach-core.ts';
import {assessFireLane,type FireBlock} from './breach-fire-safety.ts';
import type {Handling} from './breach-weapon-pose.ts';
import {muzzleAtShot,type MuzzleInput,type MuzzleSample}
  from './breach-muzzle.ts';
export type ClearanceResult={
  obstruction:boolean;blocked:boolean;retraction:number;
  /** 0..1 wall-proximity-driven rifle fold: same as visible short-stock. */
  compression:number;
  /** True receiver/shoulder accommodation, shared with rendered grip fit. */
  shoulderPullback?:number;
  blocker:FireBlock;muzzle:MuzzleSample;
  /** Carry and underarm source shared with the exact visual fit. */
  carryOverride?:Handling;shortFrom?:Handling;
  /** Deterministic distance fraction through ready→low shoulder carry. */
  carryBlend?:number;
};
/** Lead distance gives the elbows room to fold before contact; the rear
 * margin finishes compression when the free muzzle would penetrate. */
// Physical hard-block timing must not be relaxed just for visual doorway
// grace: too-short anticipation can allow an impossible tight corridor.
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
  walls:readonly Segment[]=WALLS,
  friends:readonly Pt[]=[]):ClearanceResult{
  const from:Pt={x:input.x,y:input.z};
  const check=(tip:Pt,height:number):FireBlock=>
    assessFireLane(from,height,tip,height,cover,walls,doors,friends,
      'weapon').blocker;
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
  // Preserve an actually aimed weapon first. Nearby geometry asks the
  // shooter to bring the whole gun back a couple of units before lowering
  // the muzzle or folding fully underarm. This is the SAME rigid transform
  // used by the rendered stock, both hands and the shot-time barrel.
  const engaged=input.threatRange!=null&&input.aim>=.20;
  const retracted=(mode:Handling|undefined,pullback:number)=>{
    const muzzle=muzzleAtShot({...input,
      obstruction:false,carryOverride:mode,shortCompression:undefined,
      clearanceRetraction:0,shoulderPullback:pullback});
    return {muzzle,blocker:check({x:muzzle.x,y:muzzle.z},muzzle.y)};
  };
  const pullbackSteps=[0,.8,1.6,2.4,3.2];
  const shoulderOptions:readonly (Handling|undefined)[]=engaged?
    [undefined,'point','ready']:[undefined];
  for(const carry of shoulderOptions){
    for(const back of pullbackSteps){
      const attempt=retracted(carry,back);
      if(attempt.blocker!=='clear')continue;
      // The leading horizon motivates a *small* anticipatory adjustment
      // rather than a full short-stock even before physical collision.
      const desired=Math.min(3.2,Math.max(back,proximity*2.2));
      const settled=retracted(carry,desired);
      const chosen=settled.blocker==='clear'?
        {muzzle:settled.muzzle,back:desired}:
        {muzzle:attempt.muzzle,back};
      return {obstruction:false,blocked:false,compression:0,
        retraction:0,blocker:'clear',muzzle:chosen.muzzle,
        shoulderPullback:chosen.back,carryOverride:carry};
    }
  }
  // With a confirmed threat, retain a forward-pointing source all the
  // way into underarm short-stock. Passive movement instead progressively
  // lowers the shoulder-seated rifle before tucking it.
  const carryBlend=clamp(proximity/.30);
  if(!engaged){
    const lowCarry=muzzleAtShot({...input,carryOverride:'low',
      carryBlend,obstruction:false,shortCompression:undefined,
      clearanceRetraction:0});
    const lowBlock=check({x:lowCarry.x,y:lowCarry.z},lowCarry.y);
    if(proximity<.30&&lowBlock==='clear')
      return {obstruction:false,blocked:false,compression:0,
        retraction:0,blocker:'clear',muzzle:lowCarry,
        carryOverride:'low',carryBlend};
  }
  const startFold=engaged?clamp(proximity*.52):
    proximity<.30?0:(proximity-.30)/.70;
  const shortFrom:Handling=engaged?'point':'low';
  const folded=(compression:number,pullback=0)=>{
    const muzzle=muzzleAtShot({...input,obstruction:true,
      carryOverride:'short',shortFrom,shoulderPullback:pullback,
      shortCompression:compression,clearanceRetraction:0});
    return {muzzle,blocker:check({x:muzzle.x,y:muzzle.z},muzzle.y)};
  };
  // Prefer the smallest true fold, then a small additional shoulder tuck.
  // Never claim a free muzzle because the gun is folded: the entire real
  // muzzle/body sweep must remain on the near side of solid geometry.
  for(const back of pullbackSteps){
    const comfortable=folded(startFold,back);
    if(comfortable.blocker==='clear')
      return {obstruction:true,blocked:false,compression:startFold,
        shoulderPullback:back,
        retraction:startFold*MAX_LEGACY_RETRACTION,
        blocker:'clear',muzzle:comfortable.muzzle,
        carryOverride:'short',shortFrom};
  }
  const full=folded(1);
  if(full.blocker!=='clear'){
    // Even a fully shortened weapon cannot occupy this physical position:
    // only the collision-swept corrective footstep can restore this shot.
    return {obstruction:true,blocked:true,compression:1,
      retraction:MAX_LEGACY_RETRACTION,
      blocker:full.blocker,muzzle:full.muzzle,
      carryOverride:'short',shortFrom};
  }
  let min=startFold,max=1,best=full.muzzle;
  for(let i=0;i<5;i++){
    const middle=(min+max)*.5,attempt=folded(middle);
    if(attempt.blocker==='clear'){max=middle;best=attempt.muzzle;}
    else min=middle;
  }
  return {obstruction:true,blocked:false,compression:max,
    retraction:max*MAX_LEGACY_RETRACTION,
    blocker:'clear',muzzle:best,
    carryOverride:'short',shortFrom};
}
