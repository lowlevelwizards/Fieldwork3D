/** Forecast a landing relative to the pelvis at touchdown, not the
 * pelvis that existed when the shoe left the floor. Lab-only planner. */
import type {FootstepInput,FootstepState} from './breach-footsteps.ts';
import {horizontalLegReach,fitLandingToHip,LEG_HIP_SIDE}
  from './breach-leg-geometry.ts';
import {hybridPhaseDurations} from './breach-hybrid-contact.ts';
type Pt={x:number;y:number};
const lateral=(p:Pt,facing:number,amount:number):Pt=>({
 x:p.x-Math.sin(facing)*amount,y:p.y+Math.cos(facing)*amount
});
const dotSide=(a:Pt,b:Pt,f:number)=>
 -(b.x-a.x)*Math.sin(f)+(b.y-a.y)*Math.cos(f);
export type HybridLanding={position:Pt;valid:boolean;futurePelvis:Pt;
 futureHip:Pt;reason:'clear'|'blocked'};
export function hybridLanding(input:FootstepInput,index:number,
 other:FootstepState,stepFoot:FootstepState):HybridLanding{
 const facing=input.facingYaw??-input.rootYaw;
 const d=hybridPhaseDurations(input);
 // Bounded motor-velocity projection for an airborne foot, never a
 // presentation-layer position correction.
 const horizon=d.unload+d.swing+d.landing*.5;
 const expected=Math.min(input.speed*horizon,horizontalLegReach()*.89);
 const future={x:input.position.x+Math.cos(input.travelYaw)*expected,
   y:input.position.y+Math.sin(input.travelYaw)*expected};
 const sign=index===0?-1:1,width=input.gait==='squeeze'?2.6:5.6;
 const futureHip=lateral(future,facing,sign*LEG_HIP_SIDE);
 const travelLead=input.gait==='run'?1.8:
   input.gait==='pie'||input.gait==='squeeze'?.1:.8;
 const preferred=lateral({
    x:future.x+Math.cos(input.travelYaw)*travelLead,
    y:future.y+Math.sin(input.travelYaw)*travelLead
   },facing,sign*width);
 const otherSide=dotSide(future,other.plantedAt,facing);
 const wanted=dotSide(future,preferred,facing);
 const separation=input.gait==='squeeze'?2.0:3.5;
 // When the opposite shoe is already far behind a lateral moving
 // pelvis, do not let its stale world anchor prohibit all new footholds.
 // Own-side anatomy is still mandatory and the moving shoe never snaps.
 const paired=Math.abs(otherSide)<10;
 const ownSide=sign*1.9;
 const boundary=paired?(sign<0?otherSide-separation:
   otherSide+separation):ownSide;
 const fittedSide=sign<0?Math.min(wanted,boundary):
   Math.max(wanted,boundary);
 const lateralCorrection=fittedSide-wanted;
 const spaced={x:preferred.x-Math.sin(facing)*lateralCorrection,
   y:preferred.y+Math.cos(facing)*lateralCorrection};
 const fitted=fitLandingToHip(spaced,futureHip,horizontalLegReach()-.7);
 const candidates=[fitted,
   ...[.85,.7,.55,.4].map(t=>({
     x:stepFoot.plantedAt.x+(fitted.x-stepFoot.plantedAt.x)*t,
     y:stepFoot.plantedAt.y+(fitted.y-stepFoot.plantedAt.y)*t
   }))];
 const found=candidates.find(p=>
   (!input.footAllowed||input.footAllowed(p))&&
   Math.hypot(p.x-futureHip.x,p.y-futureHip.y)<
     horizontalLegReach()-.25&&
   (sign<0?dotSide(future,p,facing)<=boundary+.25:
     dotSide(future,p,facing)>=boundary-.25));
 return {position:found??fitted,valid:!!found,
   futurePelvis:future,futureHip,reason:found?'clear':'blocked'};
}
