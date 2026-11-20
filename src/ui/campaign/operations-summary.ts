/** UXR-02: presentation-only Operations Room projection.
 * Authority stays in CampaignState and CampaignHandlers; no mutations, no
 * inferred tactical intelligence and no changes to save serialization. */
import type {CampaignState,Contract} from '../../campaign-state.ts';

export interface OperationsAttention {
  id:'squad'|'recovery'|'ammo'|'medical';
  label:string;
  destination:'personnel'|'logistics';
}
export interface OperationsSummary {
  cases:Contract[];
  leadCase:Contract|null;
  assigned:number;
  ready:number;
  freeReady:number;
  attention:OperationsAttention[];
}
export function projectOperationsSummary(c:CampaignState):OperationsSummary {
 const cases=c.contracts.filter(k=>k.status==='available'&&k.deadline>=c.day)
  .sort((a,b)=>a.deadline-b.deadline||a.id.localeCompare(b.id));
 const roster=c.squadIds.map(id=>c.operators.find(p=>p.id===id))
  .filter((p):p is CampaignState['operators'][number]=>!!p);
 const ready=roster.filter(p=>p.recoveryDays===0&&
  p.status!=='retired'&&p.status!=='lost').length;
 const recovering=roster.filter(p=>p.recoveryDays>0).length;
 const freeReady=c.operators.filter(p=>(p.status==='available'||p.status==='reserve')&&
  p.recoveryDays===0).length;
 const attention:OperationsAttention[]=[];
 if(roster.length<4)attention.push({
  id:'squad',label:'SQUAD INCOMPLETE · '+roster.length+'/4',destination:'personnel'});
 if(recovering)attention.push({
  id:'recovery',label:recovering+' DEPLOYING OPERATOR'+
  (recovering===1?'':'S')+' RECOVERING',destination:'personnel'});
 if(c.supplies.ammo<60)attention.push({
  id:'ammo',label:'LOW HQ AMMO · '+c.supplies.ammo+' ROUNDS',destination:'logistics'});
 if(c.supplies.medical===0)attention.push({
  id:'medical',label:'NO HQ MEDICAL RESERVE',destination:'logistics'});
 return {cases,leadCase:cases[0]??null,assigned:roster.length,ready,freeReady,attention};
}
