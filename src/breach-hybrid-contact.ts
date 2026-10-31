/** Five-phase physical contact animation for the lab-only hybrid.
 * Uses the shared boot articulation rather than another bob oscillator.
 */
import {footArticulation} from './breach-foot-articulation.ts';
import type {FootstepInput,FootstepState,FootTarget}
  from './breach-footsteps.ts';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const ease=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
export function hybridPhaseDurations(input:FootstepInput){
 const run=input.gait==='run',pie=input.gait==='pie',
   squeeze=input.gait==='squeeze',crouch=input.posture==='crouch',
   side=Math.abs(
     Math.sin(input.travelYaw-(input.facingYaw??-input.rootYaw)))>.6;
 return {unload:run?.028:pie?.07:.044,
   swing:run?.118:pie?.235:squeeze?.21:crouch?.215:side?.17:.18,
   landing:run?.04:pie?.07:.055,
   recovery:run?.04:pie?.09:.07};
}
export function beginHybridContact(f:FootstepState,input:FootstepInput){
 const d=hybridPhaseDurations(input);
 f.phase='unloading';f.contact=true;f.phaseStart=input.time;
 f.phaseDuration=d.unload;f.swingDuration=d.swing;
 f.landingDuration=d.landing;f.recoveryDuration=d.recovery;
}
export function advanceHybridContact(f:FootstepState,time:number){
 for(let step=0;step<5;step++){
   if(f.phase==='planted'||time<f.phaseStart+f.phaseDuration-1e-8)break;
   f.phaseStart+=f.phaseDuration;
   switch(f.phase){
     case 'unloading':
       f.phase='swinging';f.contact=false;
       f.phaseDuration=f.swingDuration;break;
     case 'swinging':
       f.phase='landing';f.contact=true;
       f.phaseDuration=f.landingDuration;
       f.plantedAt={...f.swingTo};f.worldYaw=f.targetYaw;
       f.lastTouchdown=f.phaseStart;break;
     case 'landing':
       f.phase='recovering';f.phaseDuration=f.recoveryDuration;break;
     case 'recovering':
       f.phase='planted';f.phaseDuration=0;break;
   }
 }
}
export function hybridFootTarget(f:FootstepState,input:FootstepInput):FootTarget{
 const t=f.phaseDuration>0?clamp((input.time-f.phaseStart)/
   f.phaseDuration):1;
 const shape=footArticulation(f.phase,t);
 if(f.phase==='swinging'){
  const x=ease(t);
  return {position:{
   x:lerp(f.swingFrom.x,f.swingTo.x,x),
   y:lerp(f.swingFrom.y,f.swingTo.y,x)},
   height:shape.rise*(input.gait==='run'?3.6:
     input.gait==='pie'||input.gait==='squeeze'?1.8:3)*
     (input.posture==='crouch'?.64:1),
   worldYaw:f.fromYaw+Math.atan2(
     Math.sin(f.targetYaw-f.fromYaw),
     Math.cos(f.targetYaw-f.fromYaw))*x,
   phase:f.phase,contact:false,progress:t,pitch:shape.pitch,
   reason:f.reason};
 }
 return {position:{...f.plantedAt},height:0,worldYaw:f.worldYaw,
   phase:f.phase,contact:f.contact,progress:t,pitch:shape.pitch,
   reason:f.reason};
}
