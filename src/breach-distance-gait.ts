/** Distance-driven procedural gait experiment. LAB ONLY until visual and
 * reach benchmarks prove superior to the production event scheduler.
 * This controller never moves the motor; unreachable paths produce a
 * diagnostic request instead of silently stalling a planted shoe. */
import {createFootstepScheduler,type FootstepScheduler,
  type FootstepInput,type FootTarget} from './breach-footsteps.ts';
import {horizontalLegReach,fitLandingToHip,LEG_HIP_SIDE}
  from './breach-leg-geometry.ts';
import {classifyLocomotion} from './breach-locomotion.ts';
import {decideHybridStep,hybridStepThreshold} from './breach-hybrid-step-planner.ts';
import {advanceHybridContact,beginHybridContact,hybridFootTarget} from './breach-hybrid-contact.ts';

type Pt={x:number;y:number};
const clone=(p:Pt)=>({x:p.x,y:p.y});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const lateral=(p:Pt,yaw:number,side:number,width:number):Pt=>({
  x:p.x-Math.sin(yaw)*side*width,
  y:p.y+Math.cos(yaw)*side*width
});
export type DistanceGaitState=FootstepScheduler&{
  accumulated:number;lastFacing:number;starvations:number;
  reachViolations:number;stepsTaken:number;lastStanceWidth:number;
};
export function createDistanceGait():DistanceGaitState{
  return Object.assign(createFootstepScheduler(),{
    accumulated:0,lastFacing:0,starvations:0,reachViolations:0,
    stepsTaken:0,lastStanceWidth:5.6});
}
export function cloneDistanceGait(s:DistanceGaitState):DistanceGaitState{
  return {...s,lastPosition:clone(s.lastPosition),
    feet:s.feet.map(f=>({...f,plantedAt:clone(f.plantedAt),
      swingFrom:clone(f.swingFrom),swingTo:clone(f.swingTo)})) as
      DistanceGaitState['feet']};
}
export function advanceDistanceGait(s:DistanceGaitState,input:FootstepInput):
  [FootTarget,FootTarget]{
  const facing=input.facingYaw??-input.rootYaw;
  const width=input.gait==='squeeze'?2.6:5.6;
  const travel=input.travelYaw;
  if(!s.initialized||input.time<s.lastTime-1e-4||
      input.time-s.lastTime>1.2){
    s.initialized=true;s.accumulated=0;s.lastTime=input.time;
    s.lastPosition=clone(input.position);s.lastFacing=facing;
    s.pelvisYaw=input.rootYaw;s.mode='idle';
    s.lastStepAt=-100;s.lastStepFoot=1;s.resets++;
    s.lastStanceWidth=width;
    s.feet.forEach((f,i)=>{
      const p=lateral(input.position,facing,i===0?-1:1,width);
      f.plantedAt=clone(p);f.swingFrom=clone(p);f.swingTo=clone(p);
      f.phase='planted';f.contact=true;f.phaseStart=input.time;
      f.phaseDuration=0;f.lastTouchdown=input.time;
    });
  }
  const dt=clamp(input.time-s.lastTime,0,.08);
  const travelled=input.blocked?0:distance(input.position,s.lastPosition);
  const turning=Math.abs(Math.atan2(
    Math.sin(facing-s.lastFacing),Math.cos(facing-s.lastFacing)));
  const running=input.gait==='run',deliberate=input.gait==='pie',
    squeeze=input.gait==='squeeze';
  const interval=hybridStepThreshold(input);
  s.lastStanceWidth=width;
  s.mode=classifyLocomotion(travelled/Math.max(dt,1/60),
    facing,travel,input.turning,s.mode);
  const distanceStep=travelled+(travelled<.04?turning*8.5:0);
  s.accumulated=Math.min(interval*1.35,s.accumulated+distanceStep);
  // Advance each physical contact phase exactly once on the fixed timeline.
  for(const foot of s.feet)advanceHybridContact(foot,input.time);
  const forward={x:Math.cos(travel),y:Math.sin(travel)};
  const centerHip=(footIndex:number,at:Pt)=>lateral(at,facing,
    footIndex===0?-1:1,LEG_HIP_SIDE);
  const request=decideHybridStep(s,input,travelled,turning);
  if(request){
    s.accumulated=Math.max(0,s.accumulated-request.threshold);
    const index=request.index;
    const foot=s.feet[index],side=index===0?-1:1;
    const lead=running?7:deliberate?1.6:squeeze?1.4:
      input.injury>=2?2.2:4.5;
    const predicted={
      x:input.position.x+forward.x*lead,
      y:input.position.y+forward.y*lead
    };
    const hip=centerHip(index,predicted);
    const requested=lateral(predicted,facing,side,width);
    let target=fitLandingToHip(requested,hip,horizontalLegReach()-1);
    if(input.footAllowed&&!input.footAllowed(target)){
      const candidates=[.75,.5,.25,0].map(t=>({
        x:mix(foot.plantedAt.x,target.x,t),
        y:mix(foot.plantedAt.y,target.y,t)
      }));
      const allowed=candidates.find(p=>input.footAllowed!(p)&&
        distance(p,hip)<=horizontalLegReach()-1);
      if(!allowed){s.starvations++;s.accumulated=interval;break;}
      target=allowed;
    }
    foot.swingFrom=clone(foot.plantedAt);foot.swingTo=clone(target);
    foot.fromYaw=foot.worldYaw;foot.targetYaw=input.rootYaw;
    beginHybridContact(foot,input);
    foot.lastTouchdown=-100;
    foot.reason=request.reason;
    s.lastStepFoot=index;s.lastStepAt=input.time;s.stepsTaken++;
  }
  const result=s.feet.map((f,i)=>{
    const hip=centerHip(i,input.position);
    if(f.contact&&distance(hip,f.plantedAt)>horizontalLegReach()+.5)
      s.reachViolations++;
    return hybridFootTarget(f,input);
  }) as [FootTarget,FootTarget];
  // The model can request a motor slowdown when it cannot plant, but this
  // lab prototype deliberately does not alter the authoritative motor.
  s.lastPosition=clone(input.position);s.lastTime=input.time;
  s.lastFacing=facing;s.lastYaw=input.rootYaw;
  s.pelvisYaw+=clamp(Math.atan2(
    Math.sin(input.rootYaw-s.pelvisYaw),
    Math.cos(input.rootYaw-s.pelvisYaw)),-.18,.18);
  return result;
}
