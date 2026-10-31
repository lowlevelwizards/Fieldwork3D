/** Build 182: a single anatomical source for step prediction and IK.
 * All dimensions use tactical-world units. */
export const LEG_UPPER_LENGTH=11.25;
export const LEG_LOWER_LENGTH=11.25;
export const LEG_MIN_BEND=.08;
export const LEG_HIP_HEIGHT=20.2;
export const LEG_ANKLE_HEIGHT=1.45;
export const LEG_HIP_SIDE=4.8;
export const LEG_STANCE_SIDE=5.6;
export const legMaximumLength=()=>Math.sqrt(
  LEG_UPPER_LENGTH**2+LEG_LOWER_LENGTH**2+
  2*LEG_UPPER_LENGTH*LEG_LOWER_LENGTH*Math.cos(LEG_MIN_BEND));
/** Reach measured from a real hip to a real ankle, not actor center. */
export function horizontalLegReach(hipHeight=LEG_HIP_HEIGHT,
  ankleHeight=LEG_ANKLE_HEIGHT){
  const vertical=hipHeight-ankleHeight;
  return Math.sqrt(Math.max(0,legMaximumLength()**2-vertical**2));
}
export function fitLandingToHip(
  landing:{x:number;y:number},hip:{x:number;y:number},
  reach=horizontalLegReach()-.65){
  const dx=landing.x-hip.x,dy=landing.y-hip.y;
  const length=Math.hypot(dx,dy);
  if(length<=reach)return {...landing};
  const scale=reach/Math.max(length,1e-6);
  return {x:hip.x+dx*scale,y:hip.y+dy*scale};
}
