/** A2.3: one pure directional stride/stance policy shared by the fixed-step
 * hybrid foot planner and rig pose. Does NOT move the actor or feet.
 */
import type {FootstepInput} from './breach-footsteps.ts';
import type {LocomotionMode} from './breach-locomotion.ts';
import {angleDifference} from './breach-foot-yaw.ts';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export type DirectionalFootPlan={
 travelProjection:number;travelLead:number;sideBias:number;
 landingFacing:number;lead:boolean;reverse:boolean;lateral:boolean;
};
export function directionalFootPlan(input:FootstepInput,
 mode:LocomotionMode,index:0|1,currentBootYaw:number):DirectionalFootPlan{
 const reverse=mode==='backward';
 const lateral=mode==='strafe-left'||mode==='strafe-right';
 const lead=lateral&&(mode==='strafe-left'?index===0:index===1);
 const careful=input.gait==='pie'||input.gait==='squeeze';
 // Foot placement predicts the authoritative motor, but stays conservative
 // when backing up or moving carefully. Never changes motor velocity.
 const projection=reverse?.90:careful?.90:1;
 const travelLead=reverse?.35:input.gait==='run'?1.8:
   careful?.1:.8;
 // The lead opens the lateral stance; the follow closes it. Both use the
 // same turn and clearance rules, and neither teleports a planted anchor.
 const sideBias=lateral?(mode==='strafe-right'?1:-1)*
   (lead?.75:.38):0;
 const facing=input.facingYaw??-input.rootYaw;
 // An in-place corrective boot faces toward the requested orientation
 // in bounded increments; a planted boot keeps its prior world yaw.
 const delta=angleDifference(currentBootYaw,input.rootYaw);
 const landingFacing=mode==='pivot'?
   -(currentBootYaw+clamp(delta,-.52,.52)):facing;
 return {travelProjection:projection,travelLead,sideBias,
   landingFacing,lead,reverse,lateral};
}
export function supportedPivotYaw(current:number,requested:number,
 left:number,right:number,turning:boolean):number{
 // Even a moving turn must not rotate the pelvis several radians ahead of
 // the boots. Following a moving-to-stationary transition, the same bounded
 // supported heading remains valid instead of suddenly correcting backwards.
 const bearing=current+
   (angleDifference(current,left)+angleDifference(current,right))*.5;
 const supported=bearing+clamp(angleDifference(bearing,requested),-.48,.48);
 const rate=turning?.10:.18;
 return current+clamp(angleDifference(current,supported),-rate,rate);
}
export function directionalBodyCue(speed:number,forward:number,
 side:number,crouch:number,tension:number,gait?:FootstepInput['gait']){
 const reverse=clamp((-forward-.25)/.75,0,1)*speed;
 const lateral=clamp((Math.abs(side)-.48)/.52,0,1)*speed;
 const careful=gait==='pie'||gait==='squeeze'?.48:1;
 return {
  stanceDrop:(reverse*.13+lateral*.055)*crouch*careful,
  torsoYaw:side*lateral*.011*(1-.50*tension)*careful
 };
}
