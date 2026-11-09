/** Pure locomotion sample for operator rig presentation.
 * No new simulation, footstep contact ownership, or render frame time.
 * Both live and recorded poses supply authoritative velocity/travel data.
 */
export type PoseLocomotionInput={
 x:number;z:number;heading:number;velocity:number;
 blocked?:boolean;down:boolean;travelYaw?:number;
 posture:'stand'|'crouch';acceleration?:number;
 interactionCrouch?:number;
};
const clamp=(v:number,low:number,high:number)=>
 Math.max(low,Math.min(high,v));
export function resolvePoseLocomotionFrame(
 p:PoseLocomotionInput,previous:{x:number;z:number}|null|undefined
){
 const physicalSpeed=p.blocked?0:p.velocity;
 const moving=p.down?0:Math.min(1,physicalSpeed/72);
 const direction=p.travelYaw??(previous?
  Math.atan2(p.z-previous.z,p.x-previous.x):p.heading);
 const travel=moving>.14?direction:p.heading;
 // Strafing/reverse locomotion must not rotate the pelvis away from
 // the threat. World foot contacts are independently authoritative.
 const lateral=Math.abs(Math.sin(travel-p.heading))>.52;
 const reverse=Math.cos(travel-p.heading)<-.4;
 const hipTarget=moving>.22&&!lateral&&!reverse?travel:p.heading;
 const braking=clamp(-(p.acceleration??0)/180,-1,1);
 const crouch=p.posture==='crouch'?8:
  8*clamp(p.interactionCrouch??0,0,1);
 return {physicalSpeed,moving,direction,hipTarget,braking,crouch};
}
