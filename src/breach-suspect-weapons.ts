/** D15.2 physically released firearm; not the render-only droppedGun
 * group and not an ejected magazine. Its identity survives a later pickup.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import type {SecondaryEquipment} from './secondary-equipment.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {sweptBodyClear} from './breach-navigation.ts';
export type DroppedFirearm={
 id:number;ownerId:string;p:Pt;heading:number;at:number;
 weapon:TeamActor['weapon'];weaponConfiguration?:TeamActor['weaponConfiguration'];
 loadedRounds:number;reserveRounds:number;magazineId:string;
 secondaryWeapon?:GlockAppearanceId;
 /** Actual issued pistol+magazines, no fabricated kit on retrieval. */
 secondaryEquipment?:SecondaryEquipment;
 /** Temporary friendly ground placement is not evidence until secured. */
 temporaryPlacement?:boolean;
 status:'loose'|'secured'|'retrieved';
 securedById?:string;
};
/** Place a surrendered weapon beside its owner's collision body, not under
 * their feet. A bounded candidate sequence checks actual passability.
 * Narrow spaces retain the origin; adjacent contact still handles them.
 */
export function droppedWeaponPosition(s:Session,a:TeamActor):Pt{
 const world=sessionWorldGeometry(s);
 const headings=[a.heading-Math.PI/2,a.heading+Math.PI/2,
   a.heading,a.heading+Math.PI];
 for(const radius of [25,20,30]){
  for(const heading of headings){
   const p={x:a.p.x+Math.cos(heading)*radius,
     y:a.p.y+Math.sin(heading)*radius};
   if(!world.passable(p,7)||
      !sweptBodyClear(a.p,p,s.doors,1.5,world)||
      s.operators.some(e=>e!==a&&e.health>0&&
        Math.hypot(e.p.x-p.x,e.p.y-p.y)<17))continue;
   return p;
  }
 }
 return {...a.p};
}
/** Publish recoverable evidence once for a real downed suspect. Previously
 * only surrender produced a world firearm; downed actors had a decorative
 * dropped rifle that could never be secured. Existing surrendered evidence
 * is retained, and a retrieved gun is eligible to be dropped again. */
export function releaseDownedSuspectWeapons(s:Session,a:TeamActor):void{
 if(a.side!=='red'||a.health>0||a.downedAt==null||a.downWeaponsReleased)return;
 a.downWeaponsReleased=true;
 const released=s.droppedFirearms.filter(w=>w.ownerId===a.id&&w.status!=='retrieved');
 if(!released.some(w=>!w.secondaryWeapon)){
  const item:DroppedFirearm={
   id:s.nextEffectId++,ownerId:a.id,p:droppedWeaponPosition(s,a),
   heading:a.heading,at:s.seconds,weapon:a.weapon,
   weaponConfiguration:a.weaponConfiguration?structuredClone(a.weaponConfiguration):undefined,
   loadedRounds:a.magazine,reserveRounds:a.reserve,magazineId:a.insertedMagazineId,
   status:'loose'
  };
  s.droppedFirearms.push(item);a.releasedWeaponId=item.id;
 }
 const pistol=a.equipment?.secondary;
 if(pistol?.weapon){
  s.droppedFirearms.push({
   id:s.nextEffectId++,ownerId:a.id,p:{...a.p},heading:a.heading,
   at:s.seconds,weapon:a.weapon,loadedRounds:pistol.loadedRounds,reserveRounds:0,
   magazineId:'secondary:'+a.id,secondaryWeapon:pistol.weapon,
   secondaryEquipment:structuredClone(pistol),status:'loose'
  });
  a.equipment={...a.equipment!,secondary:undefined};
 }
}
/** A unique world object receives actual held-firearm identity exactly once. */
export function releaseSuspectHeldFirearm(s:Session,a:TeamActor):DroppedFirearm{
 const pistol=a.secondarySwitch?.active==='secondary'&&
   (a.secondarySwitch.fraction??0)>=.5&&!!a.equipment?.secondary?.weapon;
 const secondary=a.equipment?.secondary;
 const item:DroppedFirearm={
  id:s.nextEffectId++,ownerId:a.id,p:droppedWeaponPosition(s,a),heading:a.heading,at:s.seconds,
  weapon:a.weapon,weaponConfiguration:a.weaponConfiguration?
    structuredClone(a.weaponConfiguration):undefined,
  loadedRounds:pistol?(secondary?.loadedRounds??0):a.magazine,
  reserveRounds:pistol?0:a.reserve,
  magazineId:pistol?'secondary:'+a.id:a.insertedMagazineId,
  ...(pistol&&secondary?.weapon?{
   secondaryWeapon:secondary.weapon,
   secondaryEquipment:structuredClone(secondary)}:{}),
  status:'loose'
 };
 s.droppedFirearms.push(item);
 // A sidearm released from the firing hand cannot remain issued in its holster.
 if(pistol&&a.equipment)a.equipment={...a.equipment,secondary:undefined};
 return item;
}
