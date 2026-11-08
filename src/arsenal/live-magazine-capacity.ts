/** Real authored magazine capacities are the combat authority whenever a
 * weapon has an equipped Arsenal magazine. Class-only/legacy guns retain
 * their explicit WEAPONS fallback (shotguns still load individual shells).
 */
import {WEAPONS,type WeaponId} from '../breach-combat.ts';
import type {WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {magazineKit,type MagazineItem} from '../breach-magazines.ts';
import {ARSENAL_MAGAZINE_CAPACITIES} from './magazine-identities.ts';

export function liveMagazineCapacity(weapon:WeaponId,
 config?:WeaponConfiguration|null):number{
 const part=config?.weapon===weapon?config.build?.parts.magazine:undefined;
 const nominal=part?ARSENAL_MAGAZINE_CAPACITIES[part]:undefined;
 return weapon==='shotgun'?WEAPONS.shotgun.capacity:
  Number.isInteger(nominal)&&nominal!>0?nominal!:WEAPONS[weapon].capacity;
}
/** Three actual spare magazine bodies, not three class-sized ammo pools. */
export function standardReserveRounds(weapon:WeaponId,
 config?:WeaponConfiguration|null):number{
 return weapon==='shotgun'?WEAPONS.shotgun.reserve:
  3*liveMagazineCapacity(weapon,config);
}
export function freshMagazineIssue(owner:string,weapon:WeaponId,
 config?:WeaponConfiguration|null){
 const capacity=liveMagazineCapacity(weapon,config);
 const reserve=standardReserveRounds(weapon,config);
 return {magazine:capacity,reserve,
  magazines:weapon==='shotgun'?[]:magazineKit(owner,weapon,reserve,capacity),
  loadedMagazineId:owner+'/'+weapon+'/loaded'};
}
/** Preserve ALL owned rounds when switching to a shorter magazine. No
 * refills, no silent deletions, and no over-capacity mag on the next reload.
 * Old magazine IDs and carry locations are kept for the first segment.
 */
export function fitMagazineInventory(owner:string,weapon:WeaponId,
 config:WeaponConfiguration|null|undefined,loaded:number,reserve:number,
 source:readonly MagazineItem[]){
 if(weapon==='shotgun')return {magazine:Math.max(0,Math.min(
   WEAPONS.shotgun.capacity,loaded)),reserve:Math.max(0,reserve),
   magazines:[] as MagazineItem[]};
 const cap=liveMagazineCapacity(weapon,config);
 const integer=(n:number)=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
 const starting=integer(loaded),spares=integer(reserve);
 // Invalid/corrupt legacy arrays get the already-owned reserve repacked.
 const valid=Array.isArray(source)&&source.length<=64&&
  source.every(m=>m&&typeof m.id==='string'&&m.weapon===weapon&&
   Number.isInteger(m.rounds)&&m.rounds>0)&&
  source.reduce((n,m)=>n+m.rounds,0)===spares;
 const issued=valid?source:magazineKit(owner,weapon,spares,cap);
 const magazines:MagazineItem[]=[];
 const used=new Set<string>();
 const add=(entry:MagazineItem)=>{
  let remaining=integer(entry.rounds),index=0;
  while(remaining>0){
   const rounds=Math.min(cap,remaining);
   let id=index===0?entry.id:entry.id+'/fit-'+index;
   let suffix=1;
   while(used.has(id))id=entry.id+'/fit-'+index+'-'+suffix++;
   used.add(id);
   magazines.push(entry.location?
    {id,weapon,rounds,location:entry.location}:{id,weapon,rounds});
   remaining-=rounds;index++;
  }
 };
 for(const mag of issued)add(mag);
 const overflow=Math.max(0,starting-cap);
 if(overflow>0)add({id:owner+'/'+weapon+'/loaded-overflow',weapon,rounds:overflow});
 return {magazine:Math.min(cap,starting),reserve:spares+overflow,magazines};
}
/** HUD warning is based on the magazine in the gun, not the reserve pool.
 * Ten rounds or <=25% capacity (whichever is smaller) signals low.
 */
export function magazineAlert(loaded:number,capacity:number):
 'normal'|'low'|'empty'{
 if(loaded<=0)return 'empty';
 return loaded<=Math.min(10,Math.max(1,Math.ceil(capacity*.25)))?
  'low':'normal';
}
