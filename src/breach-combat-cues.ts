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
/** A scene-local index over recorded shot AGE, not a second combat authority.
 * The original resolver still checks muzzle configuration and disclosure for
 * each eligible event, including a hidden newer shot before a visible older
 * one. Unlike a one-shot cache, this retains overlapping bursts in exact
 * chronological array order and works with reverse replay scrubbing.
 *
 * On a normal frame this replaces an O(actors × history) scan with one
 * O(history) traversal plus only recent shots per actor. Reuse buckets between
 * frames to avoid per-frame arrays during sustained combat.
 */
export const MAX_MUZZLE_FLASH_AGE=Math.max(...Object.values(lifetime));
const EMPTY_MUZZLE_SHOTS:readonly never[]=Object.freeze([]);
export class RecentMuzzleShotFrameIndex<T extends {shooterId:string;age:number}>{
 private readonly byShooter=new Map<string,T[]>();
 rebuild(shots:readonly T[]):void{
  for(const list of this.byShooter.values())list.length=0;
  for(const shot of shots){
   // A future event, non-finite age, or historical effect beyond every
   // weapon's maximum flash lifetime can never be an active muzzle cue.
   if(!(shot.age>=0&&shot.age<MAX_MUZZLE_FLASH_AGE))continue;
   let list=this.byShooter.get(shot.shooterId);
   if(!list){list=[];this.byShooter.set(shot.shooterId,list);}
   list.push(shot);
  }
 }
 forShooter(id:string):readonly T[]{
  return this.byShooter.get(id)??EMPTY_MUZZLE_SHOTS;
 }
 clear():void{this.byShooter.clear();}
}

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
