/** Deliberate stepping is a support decision, not a frame-time oscillator.
 * Lab-only hybrid until the visual comparison and reach gate pass.
 */
import type {FootstepInput,FootstepState} from './breach-footsteps.ts';
import {horizontalLegReach} from './breach-leg-geometry.ts';
type Pt={x:number;y:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type HybridStepRequest={index:0|1;reason:'locomotion'|'turn'|'settle';threshold:number};
export type HybridPlanningState={
 feet:readonly [FootstepState,FootstepState];lastStepFoot:number;
 lastStepAt:number;accumulated:number;lastFacing:number;
};
export function hybridStepThreshold(input:FootstepInput){
 const run=input.gait==='run',pie=input.gait==='pie',
   squeeze=input.gait==='squeeze',wound=input.injury>=2;
 const direction=Math.cos(input.travelYaw-(input.facingYaw??-input.rootYaw));
 const lateral=direction<.65;
 // A full stride is deliberate; minor correction steps use a separate
 // need based on support reach, not a constant 3-unit scurry.
 const base=run?13.2:pie?6:squeeze?4.6:
   input.posture==='crouch'?7.7:wound?8.2:lateral?9.7:11.6;
 return base;
}
export function decideHybridStep(
 s:HybridPlanningState,input:FootstepInput,travelled:number,
 turnDelta:number):HybridStepRequest|null{
 if(input.down)return null;
 const busy=s.feet.some(f=>f.phase==='swinging'||f.phase==='unloading');
 if(busy)return null; // never cancel a foot midair
 const threshold=hybridStepThreshold(input);
 const moving=travelled>.001&&!input.blocked;
 const pivot=!moving&&turnDelta>.012;
 const ready=input.time-s.lastStepAt>=
    (input.gait==='run'?.125:input.gait==='pie'?.22:.18);
 if(!ready)return null;
 const next=(1-s.lastStepFoot) as 0|1;
 if(s.feet[next].phase!=='planted'&&s.feet[next].phase!=='recovering'&&
    s.feet[next].phase!=='landing')return null;
 const reaches=s.feet.map(f=>dist(f.plantedAt,input.position));
 const urgent=Math.max(...reaches)>horizontalLegReach()-2.1;
 const needsSettle=!moving&&reaches[next]>6.8;
 if(!moving&&!pivot&&!needsSettle)return null;
 // Only one step can launch per fixed tick. The accumulator retains a
 // bounded distance debt when a high-speed motor outruns the feet.
 if(moving&&(s.accumulated>=threshold||urgent||
    s.lastStepAt<0&&s.accumulated>=threshold*.36))
   return {index:urgent&&reaches[1-next]>reaches[next]+2?
     (1-next) as 0|1:next,reason:'locomotion',threshold};
 if(pivot&&(turnDelta>.17||s.accumulated>threshold))
   return {index:next,reason:'turn',threshold};
 if(needsSettle)return {index:next,reason:'settle',threshold};
 return null;
}
export function balancedLanding(
 requested:Pt,hip:Pt,
 maxReach=horizontalLegReach()-.7):Pt{
 const dx=requested.x-hip.x,dy=requested.y-hip.y;
 const len=Math.max(1e-6,Math.hypot(dx,dy));
 const scale=clamp(maxReach/len,0,1);
 // Do not project a shoe toward the other foot when the point already
 // meets reach; output is only an anatomical fit, never a visual teleport.
 return {x:hip.x+dx*scale,y:hip.y+dy*scale};
}
