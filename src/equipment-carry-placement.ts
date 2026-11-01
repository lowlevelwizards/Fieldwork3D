/** Build 24.01: one capacity ledger for carried magazines, medical kits,
 * and entry tools. This is a read-only placement projection of authoritative
 * inventory; it does NOT duplicate ammunition, medical units, or tool stock.
 *
 * One magazine occupies one equivalent space. Medical packs and larger tools
 * consume physical space rather than materializing in a free invisible slot.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {stageMagazines,magazineSpace,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';

export type CarryLocation=MagazineLocation;
export type CarryPlacement={
 id:string;kind:'magazine'|'medical'|'utility';location:CarryLocation;
 spaces:number;accessSeconds:number;
};
type CapacityLocation=Exclude<CarryLocation,'overflow'>;
export const CARRY_ACCESS_SECONDS:Readonly<Record<CarryLocation,number>>={
 belt:.12,rig:0,pocket:.24,backpack:.8,overflow:1.25
};
const PREFERENCE:Readonly<Record<'medical'|'utility',readonly CapacityLocation[]>>={
 medical:['belt','rig','backpack','pocket'],
 utility:['belt','rig','backpack','pocket']
};
export function carryPlacementLedger(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[]=[]):CarryPlacement[]{
 const spaces=magazineSpace(kit);
 const placements:CarryPlacement[]=[];
 // The existing magazine placement authority retains each magazine identity.
 for(const magazine of stageMagazines(magazines,kit)){
  placements.push({id:magazine.id,kind:'magazine',location:magazine.location,
   spaces:1,accessSeconds:CARRY_ACCESS_SECONDS[magazine.location]});
  if(magazine.location!=='overflow')spaces[magazine.location]--;
 }
 // Extra equipment consumes remaining actual slots; larger medical packs may
 // require two adjacent units. Unfitted slots are not invented.
 for(const kind of ['medical','utility'] as const){
  const id=kit.slots[kind];
  if(id.endsWith('-none')||id==='utility-radio')continue;
  const item=EQUIPMENT_CATALOG[id];
  if(!item)continue;
  const required=Math.max(1,Math.min(3,Math.ceil(item.bulk)));
  const preferred=kind==='medical'&&id==='medical-trauma'?
   ['backpack','rig','belt','pocket'] as const:PREFERENCE[kind];
  const location=preferred.find(loc=>spaces[loc]>=required)??'overflow';
  if(location!=='overflow')spaces[location]-=required;
  placements.push({id,kind,location,spaces:required,
   accessSeconds:CARRY_ACCESS_SECONDS[location]});
 }
 return placements;
}
export function carriedItemPlacement(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[],kind:'medical'|'utility'){
 return carryPlacementLedger(kit,magazines).find(p=>p.kind===kind);
}
export function carryCapacityReport(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[]=[]){
 const capacity=magazineSpace(kit),placements=carryPlacementLedger(kit,magazines);
 const used={rig:0,belt:0,backpack:0,pocket:0};
 for(const p of placements)if(p.location!=='overflow')used[p.location]+=p.spaces;
 return {capacity,used,overflow:placements.filter(p=>p.location==='overflow'),
  placements};
}
