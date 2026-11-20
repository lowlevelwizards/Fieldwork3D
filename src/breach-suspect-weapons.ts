/** D15.2 physically released firearm; not the render-only droppedGun
 * group and not an ejected magazine. Its identity survives a later pickup.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
export type DroppedFirearm={
 id:number;ownerId:string;p:Pt;heading:number;at:number;
 weapon:TeamActor['weapon'];weaponConfiguration?:TeamActor['weaponConfiguration'];
 loadedRounds:number;reserveRounds:number;magazineId:string;
 secondaryWeapon?:GlockAppearanceId;
 status:'loose'|'secured'|'retrieved';
 securedById?:string;
};
/** A unique world object receives actual held-firearm identity exactly once. */
export function releaseSuspectHeldFirearm(s:Session,a:TeamActor):DroppedFirearm{
 const pistol=a.secondarySwitch?.active==='secondary'&&
   (a.secondarySwitch.fraction??0)>=.5&&!!a.equipment?.secondary?.weapon;
 const secondary=a.equipment?.secondary;
 const item:DroppedFirearm={
  id:s.nextEffectId++,ownerId:a.id,p:{...a.p},heading:a.heading,at:s.seconds,
  weapon:a.weapon,weaponConfiguration:a.weaponConfiguration?
    structuredClone(a.weaponConfiguration):undefined,
  loadedRounds:pistol?(secondary?.loadedRounds??0):a.magazine,
  reserveRounds:pistol?0:a.reserve,
  magazineId:pistol?'secondary:'+a.id:a.insertedMagazineId,
  ...(pistol&&secondary?.weapon?{secondaryWeapon:secondary.weapon}:{}),
  status:'loose'
 };
 s.droppedFirearms.push(item);
 // A sidearm released from the firing hand cannot remain issued in its holster.
 if(pistol&&a.equipment)a.equipment={...a.equipment,secondary:undefined};
 return item;
}
