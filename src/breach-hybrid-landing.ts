/** Forecast a landing relative to the pelvis at touchdown, not the
 * pelvis that existed when the shoe left the floor. Lab-only planner. */
import type {FootstepInput,FootstepState} from './breach-footsteps.ts';
import {horizontalLegReach,fitLandingToHip,LEG_HIP_SIDE}
  from './breach-leg-geometry.ts';
import {hybridPhaseDurations} from './breach-hybrid-contact.ts';
import {bootOutlineClearance,BOOT_WIDTH,BOOT_CLEARANCE}
  from './breach-gait-geometry.ts';
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
 const sign=index===0?-1:1,width=input.gait==='squeeze'?2.6:
  input.posture==='crouch'?6.2:5.6;
 const futureHip=lateral(future,facing,sign*LEG_HIP_SIDE);
 const travelLead=input.gait==='run'?1.8:
   input.gait==='pie'||input.gait==='squeeze'?.1:.8;
 const preferred=lateral({
    x:future.x+Math.cos(input.travelYaw)*travelLead,
    y:future.y+Math.sin(input.travelYaw)*travelLead
   },facing,sign*width);
 const otherSide=dotSide(future,other.plantedAt,facing);
 const wanted=dotSide(future,preferred,facing);
 // Keep an ordinary lateral shuffle wider than the boot itself.
 // Squeeze travel may use longitudinal staggering, but never overlap.
 const separation=input.gait==='squeeze'?2.0:BOOT_WIDTH+BOOT_CLEARANCE;
 const fittedSide=sign<0?Math.min(wanted,otherSide-separation):
   Math.max(wanted,otherSide+separation);
 const lateralCorrection=fittedSide-wanted;
 const spaced={x:preferred.x-Math.sin(facing)*lateralCorrection,
   y:preferred.y+Math.cos(facing)*lateralCorrection};
 const fitted=fitLandingToHip(spaced,futureHip,horizontalLegReach()-.7);
 // Try anatomically reachable solutions outward from the opposite shoe
 // before contracting the stride. Never alter an already planted anchor.
 const candidates=[fitted,
   ...[1.2,2.4,3.6,4.8,6].map(offset=>({
     x:fitted.x-Math.sin(facing)*sign*offset,
     y:fitted.y+Math.cos(facing)*sign*offset
   })),
   ...[.85,.7,.55,.4].map(t=>({
     x:stepFoot.plantedAt.x+(fitted.x-stepFoot.plantedAt.x)*t,
     y:stepFoot.plantedAt.y+(fitted.y-stepFoot.plantedAt.y)*t
   }))];
 const clearSwing=(p:Pt)=>{
   for(const t of [.2,.4,.6,.8,1]){
     const k=t*t*(3-2*t);
     const pos={x:stepFoot.plantedAt.x+(p.x-stepFoot.plantedAt.x)*k,
       y:stepFoot.plantedAt.y+(p.y-stepFoot.plantedAt.y)*k};
     const swingYaw=stepFoot.worldYaw+Math.atan2(
       Math.sin(input.rootYaw-stepFoot.worldYaw),
       Math.cos(input.rootYaw-stepFoot.worldYaw))*k;
     const boots=index===0?
       [{position:pos,worldYaw:swingYaw},
        {position:other.plantedAt,worldYaw:other.worldYaw}]:
       [{position:other.plantedAt,worldYaw:other.worldYaw},
        {position:pos,worldYaw:swingYaw}];
     if(bootOutlineClearance(boots[0],boots[1])<BOOT_CLEARANCE)
       return false;
   }
   return true;
 };
 const found=candidates.find(p=>
   (!input.footAllowed||input.footAllowed(p))&&
   Math.hypot(p.x-futureHip.x,p.y-futureHip.y)<
     horizontalLegReach()-.25&&
   (sign<0?dotSide(future,p,facing)<=otherSide-separation+.25:
     dotSide(future,p,facing)>=otherSide+separation-.25)&&
   clearSwing(p));
 return {position:found??fitted,valid:!!found,
   futurePelvis:future,futureHip,reason:found?'clear':'blocked'};
}
