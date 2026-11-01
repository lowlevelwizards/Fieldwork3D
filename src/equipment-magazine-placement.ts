/** Equipment 14: inventory-backed magazine accessibility.
 * The existing magazine item is authoritative; location is a physically
 * meaningful property of it, not a second ammunition pool.
 */
import type {MagazineItem} from './breach-magazines.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';

export type MagazineLocation='rig'|'belt'|'backpack'|'pocket'|'overflow';
export type LocatedMagazine=MagazineItem & {location:MagazineLocation};
const ACCESS:Record<MagazineLocation,number>={
 rig:0,belt:.12,pocket:.24,backpack:.8,overflow:1.25
};
export const magazineAccessSeconds=(location:MagazineLocation)=>ACCESS[location];

/** Reuse named carrying slots. Their declared capacity is the number of
 * magazine-equivalent spaces before reserving future tool placements.
 * A pocket always holds one emergency magazine; excess inventory remains
 * accounted for but retrieving from overflow is slower.
 */
export function magazineSpace(kit:EquipmentLoadout){
 const capacity=(id:string)=>Math.max(0,Math.floor(
  EQUIPMENT_CATALOG[id]?.capacity??0));
 return {rig:capacity(kit.slots.rig),belt:capacity(kit.slots.belt),
  backpack:capacity(kit.slots.backpack),pocket:1};
}
const priority:readonly Exclude<MagazineLocation,'overflow'>[]=['rig','belt','pocket','backpack'];
export function stageMagazines(magazines:readonly MagazineItem[],
 kit:EquipmentLoadout):LocatedMagazine[]{
 const left={...magazineSpace(kit)};
 const seen=new Set<string>();
 // Honor explicitly assigned locations first; invalidated locations
 // repack automatically when the player removes carrying equipment.
 const positions:(MagazineLocation|undefined)[]=magazines.map((m,i)=>{
  if(seen.has(m.id))throw Error('Duplicate magazine identity at '+i);
  seen.add(m.id);
  if(m.location==='overflow')return 'overflow';
  if(m.location&&left[m.location]>0){left[m.location]--;return m.location;}
  return undefined;
 });
 return magazines.map((m,i)=>{
  let loc=positions[i];
  if(!loc){
   loc='overflow';
   for(const where of priority)if(left[where]>0){
    loc=where;left[where]--;break;
   }
  }
  return {...m,location:loc};
 });
}
/** Prefer immediately accessible magazines. Within a carrying position,
 * prefer a fuller magazine so reloading remains useful.
 */
export function chooseReloadMagazine(mags:readonly MagazineItem[]):number{
 let best=-1,bestAccess=Infinity,bestRounds=-1;
 for(let i=0;i<mags.length;i++){
  const m=mags[i] as MagazineItem&{location?:MagazineLocation};
  if(m.rounds<=0)continue;
  const delay=ACCESS[m.location??'rig'];
  if(delay<bestAccess||(delay===bestAccess&&m.rounds>bestRounds)){
   best=i;bestAccess=delay;bestRounds=m.rounds;
  }
 }
 return best;
}
export function reloadMagazineDelay(mag:MagazineItem|undefined):number{
 const loc=(mag as LocatedMagazine|undefined)?.location;
 return loc?magazineAccessSeconds(loc):0;
}
export function magazinePlacementSummary(
 magazines:readonly MagazineItem[],kit:EquipmentLoadout){
 const placed=stageMagazines(magazines,kit);
 const count=(l:MagazineLocation)=>placed.filter(m=>m.location===l).length;
 return {rig:count('rig'),belt:count('belt'),pocket:count('pocket'),
  backpack:count('backpack'),overflow:count('overflow')};
}
