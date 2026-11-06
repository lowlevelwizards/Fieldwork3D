/** Pure, rigid firearm/hand transition between coupled carry and handling.
 * Never blend hands in world space away from their weapon. Reconstruct
 * stock and both palm contacts through local weapon coordinates.
 * Callers supply a recorded/explicit transition phase in replay.
 */
import * as THREE from 'three';
import type {WeaponFit} from './breach-weapon-pose.ts';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function lowReadyBlendPhase(progress:number):number{
 const t=clamp(progress);return t*t*(3-2*t);
}
export function interpolateWeaponCarry(
 from:WeaponFit,to:WeaponFit,progress:number):WeaponFit{
 const t=lowReadyBlendPhase(progress);
 if(t<=0)return from;
 if(t>=1)return to;
 const qa=new THREE.Quaternion().setFromEuler(from.rotation);
 const qb=new THREE.Quaternion().setFromEuler(to.rotation);
 const q=qa.clone().slerp(qb,t);
 const origin=from.origin.clone().lerp(to.origin,t);
 const rotation=new THREE.Euler().setFromQuaternion(q,'XYZ');
 const inverseA=qa.clone().invert(),inverseB=qb.clone().invert();
 const contact=(key:'stock'|'primary'|'support')=>{
  const localA=from[key].clone().sub(from.origin).applyQuaternion(inverseA);
  const localB=to[key].clone().sub(to.origin).applyQuaternion(inverseB);
  return localA.lerp(localB,t).applyQuaternion(q).add(origin);
 };
 return {...to,origin,rotation,
  stock:contact('stock'),primary:contact('primary'),
  support:contact('support'),
  twoHanded:from.twoHanded&&to.twoHanded,
  primaryReachable:from.primaryReachable&&to.primaryReachable,
  stockError:from.stockError+(to.stockError-from.stockError)*t,
  contactError:from.contactError+(to.contactError-from.contactError)*t};
}
