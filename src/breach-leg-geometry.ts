/** Build 182: a single anatomical source for step prediction and IK.
 * All dimensions use tactical-world units. */
export const LEG_UPPER_LENGTH=11.25;
export const LEG_LOWER_LENGTH=11.25;
export const LEG_MIN_BEND=.08;
export const LEG_HIP_HEIGHT=20.2;
export const LEG_ANKLE_HEIGHT=1.45;
export const LEG_HIP_SIDE=4.8;
export const LEG_STANCE_SIDE=5.6;
/** Shared upright neutral pose for every standing operator. The travelling
 * hip stays lower so the existing planted-foot scheduler retains reach. */
export const LEG_REST_RISE=3.05;
export function legRestRise(speed:number,posture:'stand'|'crouch',
  down=false,surrender=false):number{
  if(posture!=='stand'||down||surrender)return 0;
  return LEG_REST_RISE*Math.max(0,1-Math.max(0,speed)/12);
}
/** Neutral knee flexion in radians (0 = locked straight). No pose-specific
 * limb scaling or extra ready/ADS/short-stock knee bend. */
export const LEG_NEUTRAL_KNEE_FLEXION=2*Math.acos(Math.max(-1,Math.min(1,
  Math.hypot(LEG_HIP_HEIGHT+LEG_REST_RISE-LEG_ANKLE_HEIGHT,
    LEG_STANCE_SIDE-LEG_HIP_SIDE)/(2*LEG_UPPER_LENGTH))));

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
