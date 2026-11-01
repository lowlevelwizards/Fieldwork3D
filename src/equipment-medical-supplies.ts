/** Build 22.03: explicit portable medical consumables.
 * A kit grants capacity, not magical health. Inventory and treatment are
 * separate authorities; consumption occurs at a successful application event.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
export type MedicalSupplyId='tourniquet'|'field-dressing'|'trauma-dressing';
export type FieldMedicalSupplies=Record<MedicalSupplyId,number>;
export const MEDICAL_SUPPLY_DEFINITIONS:Readonly<Record<MedicalSupplyId,
 {name:string;massKg:number;bulk:number;accessSeconds:number}>>={
 'tourniquet':{name:'Tourniquet',massKg:.09,bulk:1,accessSeconds:.45},
 'field-dressing':{name:'Field Dressing',massKg:.11,bulk:1,accessSeconds:.70},
 'trauma-dressing':{name:'Trauma Dressing',massKg:.23,bulk:2,accessSeconds:1.05}
};
const empty=():FieldMedicalSupplies=>({
 'tourniquet':0,'field-dressing':0,'trauma-dressing':0});
export function kitMedicalSupplies(loadout?:EquipmentLoadout):FieldMedicalSupplies{
 const supply=empty();
 switch(loadout?.slots.medical){
  case 'medical-basic':
   supply['tourniquet']=1;supply['field-dressing']=2;break;
  case 'medical-trauma':
   supply['tourniquet']=2;supply['field-dressing']=2;
   supply['trauma-dressing']=2;break;
 }
 return supply;
}
export function normalizedMedicalSupplies(raw:unknown,
 kit:FieldMedicalSupplies):FieldMedicalSupplies{
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?
  raw as Record<string,unknown>:{};
 const result=empty();
 for(const id of Object.keys(result) as MedicalSupplyId[]){
  const count=source[id];result[id]=typeof count==='number'&&Number.isInteger(count)?
   Math.max(0,Math.min(kit[id],count)):kit[id];
 }
 return result;
}
export function spendMedicalSupply(supplies:FieldMedicalSupplies,
 id:MedicalSupplyId):boolean{
 if(!Object.hasOwn(supplies,id)||supplies[id]<=0)return false;
 supplies[id]--;return true;
}
/** All-or-nothing physical transfer; the receiver must actually have storage. */
export function transferMedicalSupply(from:FieldMedicalSupplies,
 to:FieldMedicalSupplies,capacity:FieldMedicalSupplies):MedicalSupplyId|null{
 for(const id of ['tourniquet','trauma-dressing','field-dressing'] as const){
  if(from[id]>0&&to[id]<capacity[id]){
   from[id]--;to[id]++;return id;
  }
 }
 return null;
}
export const medicalSupplyCount=(s:FieldMedicalSupplies)=>
 s['tourniquet']+s['field-dressing']+s['trauma-dressing'];
