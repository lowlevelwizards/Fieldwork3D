/** V3 preview-only reload rifle presentation.
 * A rifle can cant toward its support side while the magazine is handled.
 * Pivot about the real stock contact: NEVER teleport the buttplate or change
 * weapon assembly socket geometry. No recoil / ballistics / game-state writes.
 *
 * Eased entirely from the supplied reload timestamp, so replay seek/order
 * produces exactly the same visual transform with no accumulated state.
 */
import * as THREE from 'three';
import type {ReloadMode} from './breach-magazines.ts';
import type {WeaponFit} from './breach-weapon-pose.ts';
const Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
const smooth=(t:number)=>{const x=clamp(t);return x*x*(3-2*x)};
/** Deliberate temporary rifle-handling postures for bounded real-kit
 * auditions. NEVER an exhaustive runtime optimizer or ballistic transform.
 */
export type V3ReloadHold='baseline'|'support-high';
/** Keep only the physically informative B19/B20 candidate in the Lab.
 * It has not passed full-pair validation and is NEVER the default.
 */
const RELOAD_HOLDS:Record<V3ReloadHold,readonly [number,number,number,number,number]>={
 baseline:[-.17,-.065,1.35,0,0],
 'support-high':[-.085,-.05,1.40,1.45,-1.20],
};
export type ReloadWeaponPresentation={
 fit:WeaponFit;weight:number;yaw:number;pitch:number;
 forwardShift:number;verticalShift:number;lateralShift:number;
};
export function choreographV3ReloadWeapon(
 fit:WeaponFit,progress:number,mode:ReloadMode,hold:V3ReloadHold='baseline'
):ReloadWeaponPresentation{
 const t=clamp(progress);
 // Shell-loading guns already have a deliberate magazine-tube handling
 // pose; do not apply a detachable-magazine rifle cant to that family.
 const weight=mode==='shells'?0:
  smooth(t/.24)*(1-smooth((t-.76)/.24));
 if(weight<=0)return {fit,weight:0,yaw:0,pitch:0,
  forwardShift:0,verticalShift:0,lateralShift:0};
 const scale=mode==='retention'?.82:1;
 // +X is firearm forward; negative yaw shifts the firing-side hand OUT
 // away from the vest (positive Z) while the stock remains seated.
 const [requestedYaw,requestedPitch,front,vertical,lateral]=RELOAD_HOLDS[hold];
 const yaw=requestedYaw*weight*scale,pitch=requestedPitch*weight*scale;
 // A magazine reload may briefly unseat the stock FORWARD without
 // shoving the receiver sideways through rigid body armor. This small
 // scalar is a presentation-only displacement of the ENTIRE assembly.
 const forwardShift=front*weight*scale;
 const verticalShift=vertical*weight*scale;
 const lateralShift=lateral*weight*scale;
 const displacement=new THREE.Vector3(forwardShift,verticalShift,lateralShift);
 const delta=new THREE.Quaternion().setFromAxisAngle(Y,yaw)
  .multiply(new THREE.Quaternion().setFromAxisAngle(Z,pitch));
 const around=(point:THREE.Vector3)=>{
  const result=point.clone().sub(fit.stock)
   .applyQuaternion(delta).add(fit.stock);
  return result.add(displacement);
 };
 // Never mutate 'delta': the same pure rotation maps every contact
 // point while the composed quaternion only determines rifle orientation.
 const rotation=new THREE.Euler().setFromQuaternion(
  delta.clone().multiply(new THREE.Quaternion().setFromEuler(
   fit.rotation)),'XYZ');
 const newFit={...fit,origin:around(fit.origin),rotation,
  // During free reload handling the stock may unseat slightly, but
  // returns EXACTLY to the original shoulder pocket at both endpoints.
  stock:fit.stock.clone().add(displacement),
  primary:around(fit.primary),support:around(fit.support)};
 return {fit:newFit,weight,yaw,pitch,forwardShift,
  verticalShift,lateralShift};
}
