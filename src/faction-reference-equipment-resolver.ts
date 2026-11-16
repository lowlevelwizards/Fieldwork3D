/** FT1.1 historical associations are evidence-bound *research coverage*.
 * A missing record is unknown, not proof that a force did not possess an item.
 * No appearance mutation, inventory access, gameplay scoring, or rarity output.
 */
import type {ReferenceEnvironment} from './faction-reference-catalog.ts';
import {FACTION_TIMELINES} from './faction-reference-timelines.ts';
import {HISTORICAL_EQUIPMENT,historicalEquipment,type HistoricalEquipment}
 from './faction-reference-historical-equipment.ts';
import {HISTORICAL_EVIDENCE,historicalEvidence} from './faction-reference-evidence.ts';
import {HISTORICAL_ISSUE_RECORDS,type HistoricalEquipmentAssociation}
 from './faction-reference-equipment-data.ts';
export type HistoricalEquipmentResult={
 record:HistoricalEquipmentAssociation;equipment:HistoricalEquipment;
};
const byId=new Map(HISTORICAL_EQUIPMENT.map(e=>[e.id,e]));
const ordered=(a:HistoricalEquipmentResult,b:HistoricalEquipmentResult)=>
 a.equipment.category.localeCompare(b.equipment.category)||
 a.equipment.name.localeCompare(b.equipment.name)||
 a.record.id.localeCompare(b.record.id);
export function equipmentAtYear(timelineId:string,year:number,
 environment?:ReferenceEnvironment):readonly HistoricalEquipmentResult[]{
 if(!Number.isSafeInteger(year)||year<1800||year>2100)return [];
 return HISTORICAL_ISSUE_RECORDS.filter(r=>r.timelineId===timelineId&&
  r.startYear<=year&&year<=r.endYear&&
  (!environment||!r.environment||r.environment===environment))
  .flatMap(record=>{
   const equipment=byId.get(record.historicalEquipmentId);
   return equipment?[{record,equipment}]:[];
  }).sort(ordered);
}
export type HistoricalYearComparison={
 firstYear:number;secondYear:number;continued:readonly HistoricalEquipmentResult[];
 newlyDocumented:readonly HistoricalEquipmentResult[];
 notDocumentedInSecond:readonly HistoricalEquipmentResult[];
};
export function compareEquipmentYears(timelineId:string,firstYear:number,
 secondYear:number,environment?:ReferenceEnvironment):HistoricalYearComparison{
 const a=equipmentAtYear(timelineId,firstYear,environment);
 const b=equipmentAtYear(timelineId,secondYear,environment);
 const first=new Set(a.map(x=>x.equipment.id)),second=new Set(b.map(x=>x.equipment.id));
 return {firstYear,secondYear,
  continued:b.filter(x=>first.has(x.equipment.id)),
  newlyDocumented:b.filter(x=>!first.has(x.equipment.id)),
  notDocumentedInSecond:a.filter(x=>!second.has(x.equipment.id))};
}
/** Authored boundaries only. The research catalog never manufactures intermediate dates. */
export function researchMilestoneYears(timelineId:string):readonly number[]{
 return [...new Set(HISTORICAL_ISSUE_RECORDS.filter(r=>r.timelineId===timelineId)
  .flatMap(r=>[r.startYear,r.endYear]))].sort((a,b)=>a-b);
}
export function researchTimelineCoverage(timelineId:string){
 const records=HISTORICAL_ISSUE_RECORDS.filter(r=>r.timelineId===timelineId);
 const sourceIds=new Set(records.flatMap(r=>[...r.evidenceIds]));
 return {records:records.length,sourceCount:sourceIds.size,
  equipmentCount:new Set(records.map(r=>r.historicalEquipmentId)).size,
  categoryCount:new Set(records.flatMap(r=>{
   const eq=byId.get(r.historicalEquipmentId);
   return eq?[eq.category]:[];
  })).size,
  milestoneYears:researchMilestoneYears(timelineId),
  tentativeRecords:records.filter(r=>r.confidence!=='verified').length,
  plannedRecords:records.filter(r=>r.issueStatus==='planned').length
 };
}
export type HistoricalAuditIssue={id:string;message:string};
export function auditHistoricalEquipment(){
 const issues:HistoricalAuditIssue[]=[];
 const equipmentIds=new Set<string>(),evidenceIds=new Set<string>();
 const timelineIds=new Set(FACTION_TIMELINES.map(t=>t.id));
 for(const e of HISTORICAL_EQUIPMENT){
  if(equipmentIds.has(e.id))issues.push({id:e.id,message:'Duplicate equipment identity'});
  equipmentIds.add(e.id);
  if(!e.name||!e.description)issues.push({id:e.id,message:'Incomplete equipment identity'});
  if(e.model&&(!e.model.id||!e.model.note))
   issues.push({id:e.id,message:'Unlabeled visual model mapping'});
 }
 for(const e of HISTORICAL_EVIDENCE){
  if(evidenceIds.has(e.id))issues.push({id:e.id,message:'Duplicate source ID'});
  evidenceIds.add(e.id);
  if(!e.url.startsWith('https://')||!e.claim||!e.title||!e.publisher)
   issues.push({id:e.id,message:'Incomplete evidence record'});
 }
 const recordIds=new Set<string>();
 for(const r of HISTORICAL_ISSUE_RECORDS){
  if(recordIds.has(r.id))issues.push({id:r.id,message:'Duplicate association ID'});
  recordIds.add(r.id);
  if(!timelineIds.has(r.timelineId))
   issues.push({id:r.id,message:'Unknown faction timeline'});
  if(!historicalEquipment(r.historicalEquipmentId))
   issues.push({id:r.id,message:'Unknown historical equipment'});
  if(!Number.isSafeInteger(r.startYear)||!Number.isSafeInteger(r.endYear)||
    r.startYear>r.endYear||r.startYear<1800||r.endYear>2100)
   issues.push({id:r.id,message:'Invalid research window'});
  if(!r.evidenceIds.length&&r.confidence==='verified')
   issues.push({id:r.id,message:'Verified without evidence'});
  for(const id of r.evidenceIds)if(!historicalEvidence(id))
   issues.push({id:r.id,message:'Unresolved source '+id});
  if(!r.note)issues.push({id:r.id,message:'Missing qualification'});
  if(r.issueStatus==='planned'&&['standard','legacy','surplus'].includes(r.availability))
   issues.push({id:r.id,message:'Planned equipment cannot be classified as established issue'});
  if(r.confidence==='verified'&&!r.evidenceIds.length)
   issues.push({id:r.id,message:'Verified association requires a cited claim'});
  if(r.datePrecision==='approximate'&&r.confidence==='verified'&&!r.note.includes('approx'))
   issues.push({id:r.id,message:'Approximate period needs explicit uncertainty explanation'});
 }
 const populated=FACTION_TIMELINES.filter(t=>t.equipment.length).length;
 return {issues,identities:HISTORICAL_EQUIPMENT.length,
  associations:HISTORICAL_ISSUE_RECORDS.length,
  sourcedClaims:HISTORICAL_EVIDENCE.length,
  researchedTimelines:populated,totalTimelines:FACTION_TIMELINES.length};
}
