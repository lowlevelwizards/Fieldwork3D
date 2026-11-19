/** Loadout L2.13 F5 — HQ-backed quote and one-commit squad resupply.
 *
 * The existing Campaign resupplyOperator/resupplyMedicalOperator remain the
 * ONLY stock-mutating authority. Every quote previews the exact sequence of
 * those same transactions, in the current four-slot squad order. No added
 * counters, free replenishment, or separate ammo/medical transaction path.
 */
import {resupplyOperator,resupplyMedicalOperator,
 type CampaignState,type CampaignOperator} from './campaign-state.ts';
import {liveMagazineCapacity,standardReserveRounds}
 from './arsenal/live-magazine-capacity.ts';
import {kitMedicalSupplies,medicalSupplyCount}
 from './equipment-medical-supplies.ts';
import {replenishCampaignFieldPieces}
 from './equipment-campaign-field-stock.ts';

export type CampaignRefillLine={
 id:string;name:string;
 /** Required to restore this operator's configured magazine/reserve target. */
 roundsWanted:number;roundsIssued:number;roundsShort:number;
 /** Each used medical pack replaces the operator's entire missing kit. */
 medicalWanted:number;medicalIssued:number;
 wedgesWanted:number;wedgesIssued:number;wedgesShort:number;
 cuffsWanted:number;cuffsIssued:number;cuffsShort:number;
 blockedByCarry:boolean;
};
export type CampaignSquadRefillQuote={
 available:boolean;reason:string|null;
 lines:CampaignRefillLine[];
 roundsWanted:number;roundsIssued:number;roundsShort:number;
 medicalWanted:number;medicalIssued:number;
 wedgesWanted:number;wedgesIssued:number;wedgesShort:number;
 cuffsWanted:number;cuffsIssued:number;cuffsShort:number;
 blockedByCarry:boolean;
 /** Exact finite HQ quantity deducted, not credits. */
 cost:{ammo:number;medical:number;wedges:number;cuffs:number};
 partial:boolean;changed:boolean;
};
const eligible=(op:CampaignOperator)=>
 op.status!=='lost'&&op.status!=='retired';
const wantedRounds=(op:CampaignOperator)=>
 Math.max(0,liveMagazineCapacity(op.weapon,op.weaponConfiguration)-op.magazine)+
 Math.max(0,standardReserveRounds(op.weapon,op.weaponConfiguration)-op.reserve);
const wantedMedical=(op:CampaignOperator)=>
 medicalSupplyCount(op.medicalSupplies)<medicalSupplyCount(kitMedicalSupplies(op.loadout))?1:0;
type RefillPlan={quote:CampaignSquadRefillQuote;result:CampaignState};
function plan(c:CampaignState,ids:readonly string[]):RefillPlan{
 const locked=!!c.activeContractId;
 // One member can only be replenished once, even with an invalid duplicate
 // squad assignment or an unexpected duplicate requested ID.
 const unique=[...new Set(ids)].slice(0,4);
 let next=c;
 const lines:CampaignRefillLine[]=[];
 for(const id of unique){
  const op=c.operators.find(o=>o.id===id&&eligible(o));
  if(!op)continue;
  const roundsWanted=wantedRounds(op);
  const medicalWanted=wantedMedical(op);
  const beforeAmmo=next.supplies.ammo,beforeMedical=next.supplies.medical;
  if(!locked){
   next=resupplyOperator(next,id);
   next=resupplyMedicalOperator(next,id);
  }
  const field=locked?null:replenishCampaignFieldPieces(next,id);
  if(field)next=field.result;
  const roundsIssued=beforeAmmo-next.supplies.ammo;
  const medicalIssued=beforeMedical-next.supplies.medical;
  lines.push({id,name:op.callsign,roundsWanted,roundsIssued,
   roundsShort:roundsWanted-roundsIssued,
   medicalWanted,medicalIssued,
   wedgesWanted:field?.wedgesWanted??0,wedgesIssued:field?.wedgesIssued??0,
   wedgesShort:field?.wedgesShort??0,
   cuffsWanted:field?.cuffsWanted??0,cuffsIssued:field?.cuffsIssued??0,
   cuffsShort:field?.cuffsShort??0,
   blockedByCarry:field?.blockedByCarry??false});
 }
 const roundsWanted=lines.reduce((n,l)=>n+l.roundsWanted,0);
 const roundsIssued=lines.reduce((n,l)=>n+l.roundsIssued,0);
 const roundsShort=roundsWanted-roundsIssued;
 const medicalWanted=lines.reduce((n,l)=>n+l.medicalWanted,0);
 const medicalIssued=lines.reduce((n,l)=>n+l.medicalIssued,0);
 const wedgesWanted=lines.reduce((n,l)=>n+l.wedgesWanted,0);
 const wedgesIssued=lines.reduce((n,l)=>n+l.wedgesIssued,0);
 const cuffsWanted=lines.reduce((n,l)=>n+l.cuffsWanted,0);
 const cuffsIssued=lines.reduce((n,l)=>n+l.cuffsIssued,0);
 const wedgesShort=wedgesWanted-wedgesIssued,cuffsShort=cuffsWanted-cuffsIssued;
 const blockedByCarry=lines.some(l=>l.blockedByCarry);
 const partial=roundsShort>0||medicalIssued<medicalWanted||
  wedgesShort>0||cuffsShort>0;
 return {result:next,quote:{
  available:!locked&&lines.length>0,
  reason:locked?'COMPLETE CURRENT DEPLOYMENT FIRST':
   !lines.length?'NO ELIGIBLE SQUAD MEMBERS':null,
  lines,roundsWanted,roundsIssued,roundsShort,
  medicalWanted,medicalIssued,wedgesWanted,wedgesIssued,wedgesShort,
  cuffsWanted,cuffsIssued,cuffsShort,blockedByCarry,
  cost:{ammo:roundsIssued,medical:medicalIssued,
   wedges:wedgesIssued,cuffs:cuffsIssued},
  partial,changed:next!==c
 }};
}
/** The displayed quote and commit share the identical pure plan.
 * The action re-quotes the current Campaign state before committing.
 */
export function quoteCampaignSquadRefill(c:CampaignState):CampaignSquadRefillQuote{
 return plan(c,c.squadIds).quote;
}
export function refillCampaignSquad(c:CampaignState):CampaignState{
 return plan(c,c.squadIds).result;
}
export function quoteCampaignOperatorRefill(c:CampaignState,id:string):CampaignRefillLine|null{
 return plan(c,[id]).quote.lines[0]??null;
}
