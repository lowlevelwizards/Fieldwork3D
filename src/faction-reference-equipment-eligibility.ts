/** FT1.3A. Generation eligibility is strictly narrower than research browsing.
 * A dated source is not an assertion of continuous issue or global availability.
 */
import {HISTORICAL_ISSUE_RECORDS,type HistoricalEquipmentAssociation}
 from './faction-reference-equipment-data.ts';
import {HISTORICAL_EQUIPMENT,type HistoricalEquipment}
 from './faction-reference-historical-equipment.ts';
import type {ReferenceEnvironment} from './faction-reference-catalog.ts';
import {FACTION_TIMELINES} from './faction-reference-timelines.ts';

export type HistoricalGenerationContext={
 timelineId:string;year:number;month?:number;role?:string;
 environment?:ReferenceEnvironment;theater?:string;
 includeTentative?:boolean;includeTrials?:boolean;
};
export type EligibleHistoricalItem={
 equipment:HistoricalEquipment;record:HistoricalEquipmentAssociation;
 certainty:'supported'|'tentative';warnings:readonly string[];
};
export type EligibilityReport={
 status:'eligible'|'no-evidence'|'invalid-context';
 items:readonly EligibleHistoricalItem[];excluded:readonly {recordId:string;reason:string}[];
 warnings:readonly string[];
};
const equipmentMap=new Map(HISTORICAL_EQUIPMENT.map(e=>[e.id,e]));
const compare=(a:EligibleHistoricalItem,b:EligibleHistoricalItem)=>
 a.equipment.category.localeCompare(b.equipment.category)||
 a.equipment.id.localeCompare(b.equipment.id)||a.record.id.localeCompare(b.record.id);
export function historicalEquipmentEligibility(ctx:HistoricalGenerationContext):EligibilityReport{
 if(!FACTION_TIMELINES.some(t=>t.id===ctx.timelineId)||
  !Number.isSafeInteger(ctx.year)||ctx.year<1800||ctx.year>2100||
  (ctx.month!==undefined&&(!Number.isSafeInteger(ctx.month)||ctx.month<1||ctx.month>12)))
  return {status:'invalid-context',items:[],excluded:[],warnings:['Unsupported timeline or date']};
 const items:EligibleHistoricalItem[]=[],excluded:{recordId:string;reason:string}[]=[];
 for(const record of HISTORICAL_ISSUE_RECORDS.filter(r=>r.timelineId===ctx.timelineId)){
  let reason='';
  if(ctx.year<record.startYear||ctx.year>record.endYear)reason='outside evidenced years';
  else if(record.role&&record.role!==ctx.role)reason='role-specific: explicit matching role required';
  else if(record.theater&&record.theater.toLowerCase()!==ctx.theater?.toLowerCase())
   reason='theater-specific: explicit matching theater required';
  else if(record.environment&&record.environment!==ctx.environment)
   reason='environment-specific: explicit matching environment required';
  else if(record.issueStatus==='planned')reason='planned equipment is not field issue';
  else if(record.issueStatus==='trial'&&!ctx.includeTrials)reason='trial requires explicit opt-in';
  else if(record.availability==='experimental'&&!ctx.includeTrials)
   reason='experimental issue requires explicit opt-in';
  else if(record.confidence!=='verified'&&!ctx.includeTentative)
   reason='uncertain evidence requires explicit opt-in';
  const equipment=equipmentMap.get(record.historicalEquipmentId);
  if(!equipment)reason='unresolved historical identity';
  if(reason){excluded.push({recordId:record.id,reason});continue;}
  const warnings:string[]=[];
  if(record.confidence!=='verified')warnings.push('Tentative historical claim');
  if(record.startYear===ctx.year||record.endYear===ctx.year)
   warnings.push('Evidence uses year precision; do not infer month-level availability');
  if(record.datePrecision==='approximate')warnings.push('Approximate evidence year');
  if(record.issueStatus==='authorized')
   warnings.push('Authorized does not mean standard for every unit');
  if(record.issueStatus==='trial')warnings.push('Trial equipment, not routine field issue');
  items.push({record,equipment:equipment!,certainty:record.confidence==='verified'?
   'supported':'tentative',warnings});
 }
 items.sort(compare);
 return {status:items.length?'eligible':'no-evidence',items,excluded,
  warnings:items.length?[]:['No eligible supported equipment for this specific context']};
}
