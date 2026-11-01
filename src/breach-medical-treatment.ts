/** Build 22.04: simple authored treatment rules, deliberately not a
 * second damage system. Inventory is spent only after complete application.
 */
import type {WoundRecord} from './breach-medical-wounds.ts';
import type {FieldMedicalSupplies,MedicalSupplyId} from './equipment-medical-supplies.ts';
import {MEDICAL_SUPPLY_DEFINITIONS} from './equipment-medical-supplies.ts';
export function treatmentSupplyForWound(wound:WoundRecord,
 inventory:FieldMedicalSupplies):MedicalSupplyId|null{
 if(wound.stabilized||wound.bleeding<=0)return null;
 const limb=wound.region==='leg'||wound.region==='arm';
 if(limb&&wound.bleeding>=2&&inventory['tourniquet']>0)return 'tourniquet';
 if(wound.bleeding>=2&&inventory['trauma-dressing']>0)return 'trauma-dressing';
 if(wound.bleeding<=2&&inventory['field-dressing']>0)return 'field-dressing';
 return null;
}
export const treatmentDuration=(supply:MedicalSupplyId):number=>
 ({'tourniquet':1.7,'field-dressing':2.8,'trauma-dressing':3.6}[supply])+
 MEDICAL_SUPPLY_DEFINITIONS[supply].accessSeconds;
