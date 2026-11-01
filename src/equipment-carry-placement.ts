/** Build 24.00: unified accounting of issued magazines, medical items and
 * dedicated utility tools. This is a derived placement view, not a second
 * inventory authority. IDs and quantities stay in their existing domains.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {magazineSpace,stageMagazines,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {MEDICAL_SUPPLY_DEFINITIONS,type FieldMedicalSupplies,
 type MedicalSupplyId} from './equipment-medical-supplies.ts';
export type PhysicalLocation=MagazineLocation|'medical-pouch'|'utility-mount';
export type CarriedObject={id:string;kind:string;location:PhysicalLocation;
 bulk:number;accessible:boolean};
const MEDICAL_IDS:readonly MedicalSupplyId[]=[
 'tourniquet','field-dressing','trauma-dressing'];
const medPouchCapacity=(kit:EquipmentLoadout)=>
 kit.slots.medical==='medical-trauma'?8:
 kit.slots.medical==='medical-basic'?3:0;
export function physicalCarryingLayout(kit:EquipmentLoadout,
 magazines:readonly MagazineItem[],medical:FieldMedicalSupplies):CarriedObject[]{
 const mags=stageMagazines(magazines,kit);
 const room={...magazineSpace(kit),
  'medical-pouch':medPouchCapacity(kit),'utility-mount':1};
 const objects:CarriedObject[]=mags.map(m=>{
  if(m.location!=='overflow'&&room[m.location]>0)room[m.location]--;
  return {id:m.id,kind:'magazine',location:m.location??'overflow',
   bulk:1,accessible:m.location!=='overflow'};
 });
 const choose=(bulk:number):PhysicalLocation=>{
  for(const loc of ['medical-pouch','belt','rig','pocket','backpack'] as const)
   if(room[loc]>=bulk){room[loc]-=bulk;return loc;}
  return 'overflow';
 };
 for(const kind of MEDICAL_IDS){
  const count=Math.max(0,Math.min(8,Math.floor(medical[kind]??0)));
  for(let i=0;i<count;i++){
   const location=choose(MEDICAL_SUPPLY_DEFINITIONS[kind].bulk);
   objects.push({id:kind+'/'+i,kind,location,
    bulk:MEDICAL_SUPPLY_DEFINITIONS[kind].bulk,
    accessible:location!=='overflow'});
  }
 }
 const tool=kit.slots.utility;
 if(tool!=='utility-none')objects.push({
  id:'utility/'+tool,kind:tool,location:'utility-mount',
  bulk:1,accessible:true});
 return objects;
}
export function firstAccessibleMedical(layout:readonly CarriedObject[],
 kind:MedicalSupplyId):CarriedObject|undefined{
 return layout.find(item=>item.kind===kind&&item.accessible);
}
