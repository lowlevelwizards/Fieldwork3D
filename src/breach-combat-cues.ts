/** Pure, shot-aged combat presentation. The simulation's actual shot ID,
 * muzzle position, ray and hit result remain authoritative; visuals can't
 * manufacture a hit or change cover. Shared by 2D/3D cue tests.
 */
import type {WeaponId} from './breach-combat.ts';
export type MuzzleAttachment='muzzle-suppressor'|'muzzle-hider'|string|null|undefined;
const lifetime:Record<WeaponId,number>={
 carbine:.095,smg:.080,rifle:.105,shotgun:.125
};
export function muzzleFlashCue(weapon:WeaponId,age:number,
 attachment:MuzzleAttachment=null){
 const duration=lifetime[weapon];
 const signature=attachment==='muzzle-suppressor'?.25:
  attachment==='muzzle-hider'?.65:1;
 const active=age>=0&&age<duration&&signature>0;
 return {active,duration,scale:active?
   (.3+1.55*Math.max(0,1-age/duration))*signature:0};
}
/** Select the freshest still-visible *recorded* muzzle event in a burst.
 * Reverse scan is bounded by the session's existing shot-history cap and
 * does not introduce particle state, animation authority, or extra effects.
 */
export function mostRecentActiveMuzzleShot<T extends {
 shooterId:string;age:number
}>(shots:readonly T[],shooterId:string,weapon:WeaponId,
 attachment:MuzzleAttachment,visible:(shot:T)=>boolean):T|undefined{
 for(let i=shots.length-1;i>=0;i--){
  const shot=shots[i];
  if(shot.shooterId!==shooterId||
     !muzzleFlashCue(weapon,shot.age,attachment).active)continue;
  if(visible(shot))return shot;
 }
 return undefined;
}

export type ImpactSurface='blood'|'wood'|'stone'|'metal'|'glass'|'dust';
const pulse:Record<ImpactSurface,number>={
 blood:4.5,wood:3.5,stone:2.65,metal:2.9,glass:2.55,dust:2.1
};
export function impactPulse(surface:ImpactSurface,age:number,
 lifespan:number){
 const t=Math.max(0,Math.min(1,age/Math.max(.001,lifespan)));
 return {scale:pulse[surface]*(1+.32*t),
  opacity:Math.max(0,1-t),active:age>=0&&age<lifespan};
}
