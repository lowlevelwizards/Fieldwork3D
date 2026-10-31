/** Distance-driven procedural gait experiment. LAB ONLY until visual and
 * reach benchmarks prove superior to the production event scheduler.
 * This controller never moves the motor; unreachable paths produce a
 * diagnostic request instead of silently stalling a planted shoe. */
import {createFootstepScheduler,type FootstepScheduler,
  type FootstepInput,type FootTarget} from './breach-footsteps.ts';
import {horizontalLegReach,fitLandingToHip,LEG_HIP_SIDE}
  from './breach-leg-geometry.ts';
import {classifyLocomotion} from './breach-locomotion.ts';

type Pt={x:number;y:number};
const clone=(p:Pt)=>({x:p.x,y:p.y});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const lateral=(p:Pt,yaw:number,side:number,width:number):Pt=>({
  x:p.x-Math.sin(yaw)*side*width,
  y:p.y+Math.cos(yaw)*side*width
});
const eased=(t:number)=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
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
  const interval=squeeze?2.8:deliberate?3.6:running?8.4:
    input.posture==='crouch'?4.4:6.6;
  s.lastStanceWidth=width;
  s.mode=classifyLocomotion(travelled/Math.max(dt,1/60),
    facing,travel,input.turning,s.mode);
  const distanceStep=travelled+(travelled<.04?turning*2.6:0);
  s.accumulated+=Math.min(distanceStep,interval*3);
  const forward={x:Math.cos(travel),y:Math.sin(travel)};
  const centerHip=(footIndex:number,at:Pt)=>lateral(at,facing,
    footIndex===0?-1:1,LEG_HIP_SIDE);
  let attempted=0;
  while(s.accumulated>=interval&&attempted++<3&&!input.down){
    s.accumulated-=interval;
    const index=(s.lastStepFoot+1)%2;
    const foot=s.feet[index],side=index===0?-1:1;
    const lead=running?7:deliberate?1.6:squeeze?1.4:4.5;
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
    foot.phase='swinging';foot.contact=false;
    foot.phaseStart=input.time;foot.phaseDuration=0;
    foot.swingDuration=interval/Math.max(7,input.speed);
    foot.lastTouchdown=-100;
    foot.reason='locomotion';
    s.lastStepFoot=index;s.lastStepAt=input.time;s.stepsTaken++;
  }
  const result=s.feet.map((f,i)=>{
    if(f.phase==='swinging'){
      // Motion distance, not a second time-driven gait, advances travel.
      // Short settling time only finishes an already airborne foot at rest.
      const maxDuration=Math.max(.08,f.swingDuration);
      const fraction=clamp((input.time-f.phaseStart)/maxDuration,0,1);
      const progress=eased(fraction);
      const point={x:mix(f.swingFrom.x,f.swingTo.x,progress),
        y:mix(f.swingFrom.y,f.swingTo.y,progress)};
      if(fraction>=1){
        f.plantedAt=clone(f.swingTo);f.phase='planted';
        f.contact=true;f.lastTouchdown=input.time;
      }else return {position:point,height:Math.sin(Math.PI*progress)*
        (running?3.6:squeeze?1.1:2.5),
        worldYaw:mix(f.fromYaw,f.targetYaw,progress),
        phase:'swinging' as const,contact:false,progress};
    }
    const hip=centerHip(i,input.position);
    if(distance(hip,f.plantedAt)>horizontalLegReach()+.5)
      s.reachViolations++;
    return {position:clone(f.plantedAt),height:0,worldYaw:f.worldYaw,
      phase:'planted' as const,contact:true,progress:1};
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
