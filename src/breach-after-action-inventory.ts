/** L2.13 F4 — read-only after-action carry and readiness projection.
 * Only current LIVE mission actors describe final equipment; the recorder's
 * initial frame and frozen manifest describe the deployed issue. Campaign
 * settlement remains the owner of persistent stock and replenishment.
 *
 * No simulated spending, restock or inferred film outcomes occur here.
 */
import type {Session} from './breach-game.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {CampaignState} from './campaign-state.ts';
import {tacticalSlotOperator} from './campaign-state.ts';
import {liveMagazineCapacity,standardReserveRounds} from './arsenal/live-magazine-capacity.ts';
import {fieldQuantity,initialFieldInventory,type FieldInventory,
 type FieldItemId} from './equipment-field-inventory.ts';
import {kitMedicalSupplies,medicalSupplyCount,
 type FieldMedicalSupplies} from './equipment-medical-supplies.ts';

export type CloseoutQuantity={issued:number|null;remaining:number;netUsed:number|null};
export type OperatorInventoryCloseout={
 id:string;name:string;careerId:string|null;
 rounds:CloseoutQuantity;flash:CloseoutQuantity;
 wedges:CloseoutQuantity;cuffs:CloseoutQuantity;medical:CloseoutQuantity;
 shots:number;spareMagazines:number;magazineIds:string[];
 condition:'active'|'injured'|'incapacitated';
 carryLocations:Record<'flash'|'wedges'|'cuffs',readonly string[]>;
 manifestMismatch:boolean;
 readiness:'fresh-round'|'ready'|'recovering'|'replenish'|'not-assessed';
 needs:readonly string[];
 /** True only when first authoritative film frame exists at mission start. */
 hasStartEvidence:boolean;
};
export type AfterActionInventoryCloseout={
 mode:'mission'|'quick'|'other';
 operators:OperatorInventoryCloseout[];
 hqStock:{ammo:number;medical:number;flash:number}|null;
 /** Do not pretend an incomplete archive can prove all mission consumption. */
 source:'live-closeout';
};
type RecorderEvidence=Pick<MissionRecorder,'manifest'|'frames'>;
type MissionEvidence=Pick<Session,'operators'|'phase'>;
const usable=(n:number|undefined):number=>
 typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
const qty=(initial:number|null,end:number):CloseoutQuantity=>({
 issued:initial,remaining:usable(end),
 netUsed:initial===null?null:Math.max(0,initial-usable(end))
});
const initialField=(raw:FieldInventory|undefined,kit:NonNullable<
 MissionEvidence['operators'][number]['equipment']>):FieldInventory=>
 raw??initialFieldInventory(kit);
const count=(inventory:FieldInventory|undefined,id:FieldItemId)=>
 inventory?fieldQuantity(inventory,id):0;
const medical=(s:FieldMedicalSupplies|undefined)=>
 s?medicalSupplyCount(s):0;
const totalRounds=(magazine:number,reserve:number)=>
 usable(magazine)+usable(reserve);
export function buildAfterActionInventoryCloseout(input:{
 session:MissionEvidence;recorder:RecorderEvidence;
 mode:'mission'|'quick'|'other';campaign?:CampaignState|null;
}):AfterActionInventoryCloseout{
 const {session,recorder,mode}=input,campaign=input.campaign??null;
 const first=recorder.frames[0];
 // A late or truncated recording cannot establish actual initial stock.
 const hasStart=!!first&&first.t>=0&&first.t<=.06;
 const startById=new Map((hasStart?first.actors:[]).map(actor=>[actor.id,actor]));
 const operators=session.operators.filter(a=>a.side==='blue').map(actor=>{
  const initial=startById.get(actor.id);
  const currentField=actor.equipment?
   initialField(actor.equipment.fieldInventory,actor.equipment):undefined;
  const stocked=(id:FieldItemId,remaining:number):CloseoutQuantity=>
   qty(hasStart&&initial?(
     id==='flashbang'?initial.flashCharges:
     id==='wedge'?initial.wedgeRemaining:
     id==='zip-tie'?initial.restraintRemaining:0)??null:null,remaining);
  const rounds=qty(hasStart&&initial?totalRounds(initial.magazine,initial.reserve):null,
   totalRounds(actor.magazine,actor.reserve));
  const flash=stocked('flashbang',actor.flashCharges);
  const wedges=stocked('wedge',actor.wedgeRemaining);
  const cuffs=stocked('zip-tie',actor.restraintRemaining);
  const supplies=qty(hasStart&&initial?.medicalSupplies?
   medical(initial.medicalSupplies):null,
   medical(actor.medicalSupplies));
  const locations=(id:FieldItemId):string[]=>
   currentField?.stacks.filter(row=>row.itemId===id).map(row=>
     row.location.toUpperCase()+(row.quantity>1?' ×'+row.quantity:''))??[];
  const carryLocations={
   flash:locations('flashbang'),wedges:locations('wedge'),cuffs:locations('zip-tie')
  };
  const manifestMismatch=!!currentField&&(
   count(currentField,'flashbang')!==actor.flashCharges||
   count(currentField,'wedge')!==actor.wedgeRemaining||
   count(currentField,'zip-tie')!==actor.restraintRemaining);
  const career=mode==='mission'&&campaign?
   tacticalSlotOperator(campaign,actor.id):undefined;
  const needs:string[]=[];
  let readiness:OperatorInventoryCloseout['readiness']='not-assessed';
  if(mode==='quick')readiness='fresh-round';
  else if(mode==='mission'&&career&&campaign?.activeContractId===null){
   if(career.recoveryDays>0||actor.health<=0)readiness='recovering';
   const full=liveMagazineCapacity(career.weapon,career.weaponConfiguration);
   const reserve=standardReserveRounds(career.weapon,career.weaponConfiguration);
   if(career.magazine<full||career.reserve<reserve)needs.push('AMMUNITION');
   const capacity=kitMedicalSupplies(career.loadout);
   if(medical(career.medicalSupplies)<medical(capacity))
    needs.push('MEDICAL');
   if(wedges.netUsed!==null&&wedges.netUsed>0)needs.push('WEDGES');
   if(cuffs.netUsed!==null&&cuffs.netUsed>0)needs.push('FLEX CUFFS');
   if(readiness!=='recovering')
    readiness=needs.length?'replenish':'ready';
  }
  return {
   id:actor.id,name:actor.name,careerId:career?.id??null,
   rounds,flash,wedges,cuffs,medical:supplies,carryLocations,
   manifestMismatch,
   shots:usable(actor.shots),
   spareMagazines:actor.spareMagazines.length,
   magazineIds:actor.spareMagazines.map(m=>m.id),
   condition:actor.health<=0?'incapacitated' as const:
    actor.injuryStage>0?'injured' as const:'active' as const,
   readiness,needs,hasStartEvidence:hasStart&&!!initial
  };
 });
 return {mode,operators,source:'live-closeout',
  hqStock:mode==='mission'&&campaign?{
   ammo:campaign.supplies.ammo,medical:campaign.supplies.medical,
   flash:campaign.supplies.flash
  }:null};
}
