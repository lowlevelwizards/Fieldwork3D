/** A2.2: time-sampled movement impulses and foot-landing recovery.
 * No render dt, new clock, step placement, collision or shot authority.
 * Sparse impulses are reconstructed from already archived acceleration.
 */
import type {FootTarget} from './breach-footsteps.ts';
export type MomentumEnvelope={drive:number;brake:number};
export type MotionEvent={at:number;strength:number};
export type AccelerationSample={at:number;acceleration:number};
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const smooth=(n:number)=>{const x=clamp(n,0,1);return x*x*(3-2*x)};
/** Record only significant changes. Shared live/replay sampling is O(log N). */
export function indexMovementImpulses(
 samples:readonly AccelerationSample[]):{
 drive:MotionEvent[];brake:MotionEvent[]}{
 const drive:MotionEvent[]=[],brake:MotionEvent[]=[];
 for(const sample of samples){
  const magnitude=clamp(sample.acceleration/230,-1,1);
  if(magnitude>.14)drive.push({at:sample.at,strength:magnitude});
  else if(magnitude<-.14)brake.push({at:sample.at,strength:-magnitude});
 }
 return {drive,brake};
}
export function movementImpulseSample(
 events:readonly MotionEvent[],time:number,duration:number):number{
 if(!events.length||time<events[0].at)return 0;
 let lo=0,hi=events.length-1;
 while(lo<hi){
  const mid=Math.ceil((lo+hi)/2);
  if(events[mid].at<=time)lo=mid;else hi=mid-1;
 }
 const age=time-events[lo].at;
 if(age<0||age>=duration)return 0;
 // Ends at exactly zero. No lingering spring energy or render history.
 return events[lo].strength*(1-smooth(age/duration));
}
export function sampleMovementImpulses(
 drive:readonly MotionEvent[],brake:readonly MotionEvent[],
 time:number):MomentumEnvelope{
 return {drive:movementImpulseSample(drive,time,.26),
  brake:movementImpulseSample(brake,time,.38)};
}
export type MotionTransitionInput={
 velocity:number;acceleration?:number;
 travelYaw:number;heading:number;
 feet:readonly [FootTarget,FootTarget];
 impulse?:MomentumEnvelope;
 gait?:'walk'|'run'|'pie'|'squeeze';
 posture:'stand'|'crouch';injury:number;
 blocked?:boolean;down?:boolean;surrender?:boolean;
 tacticalTension?:number;
};
export type MotionTransitionOutput={
 start:number;brake:number;settle:number;
 pelvisY:number;torsoForward:number;torsoSide:number;
 headPitchCounter:number;chestLift:number;
};
export function motionFromTransitions(
 input:MotionTransitionInput):MotionTransitionOutput{
 const zero={start:0,brake:0,settle:0,pelvisY:0,torsoForward:0,
  torsoSide:0,headPitchCounter:0,chestLift:0};
 if(input.blocked||input.down||input.surrender)return zero;
 const speed=clamp(input.velocity/72,0,1);
 const accel=clamp((input.acceleration??0)/230,-1,1);
 const drive=clamp(input.impulse?.drive??Math.max(0,accel),0,1);
 const brake=clamp(input.impulse?.brake??Math.max(0,-accel),0,1);
 const envelope=(phase:FootTarget['phase'])=>{
  let e=0;
  for(const foot of input.feet)if(foot.phase===phase){
   const t=clamp(foot.progress??0,0,1);
   e=Math.max(e,Math.sin(Math.PI*t));
  }
  return e;
 };
 const unload=envelope('unloading'),swing=envelope('swinging');
 const receive=envelope('landing'),recover=envelope('recovering');
 const cautious=input.gait==='squeeze'?.48:input.gait==='pie'?.52:1;
 const crouch=input.posture==='crouch'?.64:1;
 const injury=input.injury>=2?.72:1;
 const tension=1-.38*clamp(input.tacticalTension??0,0,1);
 // Start/stop never alter motor velocity. They are merely response
 // envelopes from the recorded fixed-tick acceleration.
 const start=drive*(.52+.48*Math.max(unload,swing))*
  clamp(input.velocity/16,0,1);
 const braking=brake;
 // Once speed is low, the existing scheduled receiving/recovering foot
 // can finish the stop even if the acceleration pulse has already ended.
 // At true rest with both feet planted, there is strictly no motion.
 const settle=(receive*.55+recover*.45)*
  (1-smooth(speed/.38))*
  (input.gait==='run'?1:input.gait==='pie'?.30:.62);
 const direction=input.travelYaw-input.heading;
 const forward=Math.cos(direction),side=Math.sin(direction);
 const push=-start*.038+braking*.065+settle*.016;
 const roll=-start*.022+braking*.044+settle*.013;
 const gain=cautious*crouch*injury;
 const torsoForward=clamp(push*forward*gain,-.09,.09);
 const torsoSide=clamp(roll*side*gain,-.07,.07);
 return {start,brake:braking,settle,
  pelvisY:clamp((start*.12-braking*.23-settle*.23)*
   gain,-.52,.18),
  torsoForward:torsoForward*tension,
  torsoSide:torsoSide*tension,
  headPitchCounter:clamp(-torsoForward*.55,-.05,.05),
  chestLift:clamp((start*.075-braking*.12-settle*.16)*
   gain,-.25,.08)};
}
