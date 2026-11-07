/** V3 preview-only, *de-shouldered* magazine-reload presentation.
 * A magazine reload often briefly unseats the rifle from its buttplate:
 * the firing hand brings the assembly toward the support shoulder, so the
 * support arm can reach the actual magazine WITHOUT crossing the rigid torso.
 * Every firearm landmark shares exactly one rigid transform. The magazine
 * well is never redefined and no game-state/shot-time changes occur.
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
export type ReloadWeaponPresentation={
 fit:WeaponFit;weight:number;yaw:number;pitch:number;
 /** Displacement of the buttplate during reload; only zero at endpoints. */
 stockShift:THREE.Vector3;
};
export function choreographV3ReloadWeapon(
 fit:WeaponFit,progress:number,mode:ReloadMode
):ReloadWeaponPresentation{
 const t=clamp(progress);
 // Shell-loading guns already have a deliberate magazine-tube handling
 // pose; do not apply a detachable-magazine rifle cant to that family.
 const weight=mode==='shells'?0:
  smooth(t/.24)*(1-smooth((t-.76)/.24));
 if(weight<=0)return {fit,weight:0,yaw:0,pitch:0,
  stockShift:new THREE.Vector3()};
 const scale=mode==='retention'?.82:1;
 // +X forward, -Z support-side. The previous firing-side cant held the
 // magazine too far ACROSS the torso for the opposite arm to reach.
 // Unlike aiming, de-shouldering permits a small stock displacement.
 const yaw=.30*weight*scale,pitch=-.045*weight*scale;
 const stockShift=new THREE.Vector3(
  .45*weight*scale,-.38*weight*scale,-1.95*weight*scale);
 const delta=new THREE.Quaternion().setFromAxisAngle(Y,yaw)
  .multiply(new THREE.Quaternion().setFromAxisAngle(Z,pitch));
 const around=(point:THREE.Vector3)=>point.clone()
  .sub(fit.stock).applyQuaternion(delta).add(fit.stock)
  .add(stockShift);
 // Never mutate 'delta': the same pure rotation maps every contact
 // point while the composed quaternion only determines rifle orientation.
 const rotation=new THREE.Euler().setFromQuaternion(
  delta.clone().multiply(new THREE.Quaternion().setFromEuler(
   fit.rotation)),'XYZ');
 const newFit={...fit,origin:around(fit.origin),rotation,
  // Stock is deliberately UNSEATED only in the middle of the reload,
  // and all three contact points undergo the very same rigid transform.
  stock:fit.stock.clone().add(stockShift),primary:around(fit.primary),
  support:around(fit.support)};
 return {fit:newFit,weight,yaw,pitch,stockShift};
}
