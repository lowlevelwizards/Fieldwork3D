/** S2 secondary *loadout* authority. The legacy primary WeaponId and
 * firing pipeline stay untouched until S5/S7. No cosmetic holster, renderer
 * or Arsenal preview may create ammunition or active-world weapon instances.
 * IDs are stable per owner + model; no dynamic serial generation in renders.
 */
import {isGlockAppearanceId,type GlockAppearanceId}
 from './weapons/geometry/glock-family-silhouettes.ts';
export type SecondaryHolster='belt-right'|'belt-left';
export type SecondaryMagazineLocation='rig'|'belt'|'pocket'|'backpack'|'overflow';
export type SecondaryMagazine=Readonly<{
 id:string;rounds:number;location:SecondaryMagazineLocation;
}>;
export type SecondaryEquipment=Readonly<{
 version:1;weapon:GlockAppearanceId|null;holster:SecondaryHolster;
 loadedMagazineId:string|null;loadedRounds:number;
 spareMagazines:readonly SecondaryMagazine[];
}>;
export const SECONDARY_CAPACITY:Readonly<Record<GlockAppearanceId,number>>={
 'glock-g19-gen3':15,'glock-g26':10,'glock-g19x':17,
 'glock-g19-gen5-mos':15
};
export const SECONDARY_MASS_KG:Readonly<Record<GlockAppearanceId,number>>={
 'glock-g19-gen3':.67,'glock-g26':.61,'glock-g19x':.70,
 'glock-g19-gen5-mos':.68
};
const locs:readonly SecondaryMagazineLocation[]=
 ['rig','belt','pocket','backpack','overflow'];
const holsters:readonly SecondaryHolster[]=['belt-right','belt-left'];
const validOwner=(owner:string)=>owner.replace(/[^a-z0-9_-]/gi,'').slice(0,48)||'operator';
export function emptySecondaryEquipment():SecondaryEquipment{
 return {version:1,weapon:null,holster:'belt-right',
  loadedMagazineId:null,loadedRounds:0,spareMagazines:[]};
}
/** Fresh Quick Play issue only, never a mission reload or Campaign allocation.
 * All spare magazines occupy explicit carrier places (subject to S4 capacity).
 */
export function initialSecondaryEquipment(owner:string,
 weapon:GlockAppearanceId|null=null,holster:SecondaryHolster='belt-right'
):SecondaryEquipment{
 if(!weapon)return emptySecondaryEquipment();
 const prefix=validOwner(owner)+'/secondary/'+weapon;
 const capacity=SECONDARY_CAPACITY[weapon];
 return {version:1,weapon,holster,loadedMagazineId:prefix+'/loaded',
  loadedRounds:capacity,spareMagazines:[0,1].map(i=>({
   id:prefix+'/spare-'+i,rounds:capacity,location:'belt' as const
  }))};
}
/** Strict V1 read: no unknown weapon, duplicate IDs, negative rounds or
 * authoritatively created ammunition from missing/corrupt magazine state. */
export function readSecondaryEquipment(raw:unknown,owner:string):SecondaryEquipment{
 const empty=emptySecondaryEquipment();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return empty;
 const v=raw as Partial<SecondaryEquipment>;
 if(v.version!==1)return empty;
 const holster=holsters.includes(v.holster as SecondaryHolster)?
  v.holster as SecondaryHolster:'belt-right';
 // Holster-side preference survives even while the pistol is unequipped.
 if(v.weapon===null)return {...empty,holster};
 if(typeof v.weapon!=='string'||!isGlockAppearanceId(v.weapon))return empty;
 const capacity=SECONDARY_CAPACITY[v.weapon];
 const prefix=validOwner(owner)+'/secondary/'+v.weapon;
 if(v.loadedMagazineId!==prefix+'/loaded'||!Number.isInteger(v.loadedRounds)||
  v.loadedRounds!<0||v.loadedRounds!>capacity||
  !Array.isArray(v.spareMagazines)||v.spareMagazines.length>6)
  return empty;
 const seen=new Set([v.loadedMagazineId]);
 const spareMagazines:SecondaryMagazine[]=[];
 for(const m of v.spareMagazines){
  if(!m||typeof m!=='object'||typeof m.id!=='string'||
   !/^spare-[0-5]$/.test(m.id.slice((prefix+'/').length))||
   !m.id.startsWith(prefix+'/spare-')||seen.has(m.id)||
   !Number.isInteger(m.rounds)||m.rounds<0||m.rounds>capacity||
   !locs.includes(m.location))return empty;
  seen.add(m.id);
  spareMagazines.push({id:m.id,rounds:m.rounds,location:m.location});
 }
 return {version:1,weapon:v.weapon,holster,
  loadedMagazineId:v.loadedMagazineId,loadedRounds:v.loadedRounds!,
  spareMagazines};
}
export function equipFreshSecondary(state:SecondaryEquipment,owner:string,
 weapon:GlockAppearanceId|null):SecondaryEquipment{
 if(state.weapon===weapon)return state; // choosing same item never refills
 if(weapon===null)return {...emptySecondaryEquipment(),holster:state.holster};
 return initialSecondaryEquipment(owner,weapon,state.holster);
}
export function moveSecondaryHolster(state:SecondaryEquipment,
 holster:SecondaryHolster):SecondaryEquipment{
 return holsters.includes(holster)&&state.holster!==holster?
  {...state,holster}:state;
}
export function secondaryLoadMass(state:SecondaryEquipment):number{
 if(!state.weapon)return 0;
 // Loaded handgun, actual spare magazines and an occupied belt holster.
 return SECONDARY_MASS_KG[state.weapon]+.18+state.spareMagazines.length*.22;
}
export function secondaryRoundTotal(state:SecondaryEquipment):number{
 return state.loadedRounds+state.spareMagazines.reduce((n,m)=>n+m.rounds,0);
}

/** Carrier-space normalization for explicitly owned magazines. No ammo or
 * serial ID is added. The holster permanently reserves one belt cell.
 * Never paper over a missing belt: the equipment selector must repair that.
 */
export type SecondaryCarrierSpace=Readonly<{
 rig:number;belt:number;backpack:number;pocket:number
}>;
export function placeSecondaryMagazines(state:SecondaryEquipment,
 capacity:SecondaryCarrierSpace):SecondaryEquipment{
 if(!state.weapon)return state;
 const available={
  rig:Math.max(0,capacity.rig|0),
  belt:Math.max(0,(capacity.belt|0)-1),
  pocket:Math.max(0,capacity.pocket|0),
  backpack:Math.max(0,capacity.backpack|0)
 };
 const locations:(SecondaryMagazineLocation|undefined)[]=
  state.spareMagazines.map(m=>{
   if(m.location==='overflow')return 'overflow';
   if(available[m.location]>0){available[m.location]--;return m.location;}
   return undefined;
  });
 const priority:readonly (keyof typeof available)[]=
  ['rig','belt','pocket','backpack'];
 const placed=state.spareMagazines.map((m,i)=>{
  let location=locations[i];
  if(!location){
   location='overflow';
   for(const slot of priority)if(available[slot]>0){
    location=slot;available[slot]--;break;
   }
  }
  return location===m.location?m:{...m,location};
 });
 return placed.every((m,i)=>m===state.spareMagazines[i])?
  state:{...state,spareMagazines:placed};
}
