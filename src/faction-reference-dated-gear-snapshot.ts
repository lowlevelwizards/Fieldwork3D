/** FT1.6C: read-only dated snapshot resolution.
 * A valid era reference is a VISUAL proxy; only an exact authored snapshot
 * gets an exact visual index. Neither proves complete historic issue.
 * No cross-environment interpolation, retirement, inventory or save mutation.
 */
import {GEAR_CATEGORIES,referenceGearSettings,
 type GearCategory,type GearSetting,type GearDelta}
 from './faction-reference-gear-chronology.ts';
import {resolveTimelineYear,timelineById} from './faction-reference-timeline-resolver.ts';
import {historicalEquipmentEligibility,type HistoricalGenerationContext}
 from './faction-reference-equipment-eligibility.ts';
import {gameMappingForHistorical,type HistoricalGameMapping}
 from './faction-reference-game-mapping.ts';
import {prioritizeContentDemand,type DemandItem}
 from './faction-reference-content-demand.ts';
import type {ReferenceEnvironment} from './faction-reference-catalog.ts';

export type GearSnapshotHistoricalItem={
 identityId:string;recordId:string;name:string;category:GearCategory;
 issueStatus:'documented-use'|'authorized'|'trial'|'planned';
 sourceIds:readonly string[];certainty:'supported'|'tentative';
 mapping:HistoricalGameMapping|null;
};
export type DatedGearSnapshot={
 timelineId:string;year:number;environment?:ReferenceEnvironment;
 state:'exact-visual-index'|'period-visual-proxy'|
  'ambiguous-environment'|'no-visual'|'invalid-context';
 visualReferenceId:string|null;
 visual:Readonly<Record<GearCategory,readonly GearSetting[]>>;
 evidenceStatus:'eligible'|'no-evidence'|'invalid-context';
 historical:readonly GearSnapshotHistoricalItem[];
 unknownHistoricalCategories:readonly GearCategory[];
 sourceCount:number;warnings:readonly string[];
 contentDemand:readonly DemandItem[];
 /** Unknown categories are never filled with fabricated historical facts. */
 completeHistoricalKitVerified:false;
};
const blank=()=>Object.fromEntries(GEAR_CATEGORIES.map(x=>[x,[]])) as
 Record<GearCategory,readonly GearSetting[]>;
const histCategory=(category:string):GearCategory=>
 category==='headwear'?'headgear':
 GEAR_CATEGORIES.includes(category as GearCategory)?category as GearCategory:'accessories';
export function resolveDatedGearSnapshot(context:HistoricalGenerationContext,
 preferredReferenceId?:string):DatedGearSnapshot{
 const timeline=timelineById(context.timelineId);
 const valid=!!timeline&&Number.isSafeInteger(context.year)&&
  context.year>=1800&&context.year<=2100;
 const resolved=valid?resolveTimelineYear(timeline!,context.year,context.environment):null;
 const evidence=historicalEquipmentEligibility(context);
 const matches=resolved?.matches??[];
 const envs=new Set(matches.map(x=>x.snapshot.environment));
 const ambiguous=!context.environment&&envs.size>1&&!preferredReferenceId;
 const selected=ambiguous?undefined:
  preferredReferenceId?matches.find(x=>x.reference.id===preferredReferenceId):matches[0];
 const missingPreference=!!preferredReferenceId&&!selected;
 const state:DatedGearSnapshot['state']=!valid||missingPreference?'invalid-context':
  ambiguous?'ambiguous-environment':
  !selected?'no-visual':
  selected.snapshot.representativeYear===context.year?
   'exact-visual-index':'period-visual-proxy';
 const historical=evidence.items.map(item=>({
  identityId:item.equipment.id,recordId:item.record.id,
  name:item.equipment.name,category:histCategory(item.equipment.category),
  issueStatus:item.record.issueStatus,sourceIds:[...item.record.evidenceIds],
  certainty:item.certainty,mapping:gameMappingForHistorical(item.equipment)
 }));
 const known=new Set(historical.map(x=>x.category));
 const contentDemand=selected?prioritizeContentDemand().filter(row=>
  row.affectedReferenceIds.includes(selected.reference.id)):[];
 const warnings:string[]=[
  ...evidence.warnings,
  ...(state==='period-visual-proxy'?[
   'A period-matched reference look is a visual proxy, not sourced equipment history']:[]),
  ...(state==='exact-visual-index'?[
   'A reference snapshot year indexes art; it does not prove issue of all items']:[]),
  ...(ambiguous?['Multiple appearance environments match: select an environment or specific reference']:[]),
  ...(missingPreference?['Selected reference is not valid in the requested timeline/year/environment']:[]),
  ...(state==='no-visual'?['No dated appearance covers this selection; do not interpolate']:[]),
  'Historical equipment records do not certify a complete co-issued kit'
 ];
 return {timelineId:context.timelineId,year:context.year,
  ...((context.environment??selected?.snapshot.environment)?
   {environment:context.environment??selected?.snapshot.environment}:{}),
  state,visualReferenceId:selected?.reference.id??null,
  visual:selected?referenceGearSettings(selected.reference.id):blank(),
  evidenceStatus:evidence.status,historical,
  unknownHistoricalCategories:GEAR_CATEGORIES.filter(x=>!known.has(x)),
  sourceCount:new Set(historical.flatMap(x=>x.sourceIds)).size,
  warnings,contentDemand,completeHistoricalKitVerified:false};
}
export type DatedGearComparison={
 comparable:boolean;reason:string;
 first:DatedGearSnapshot;second:DatedGearSnapshot;
 changes:readonly GearDelta[];
};
export function compareDatedGearSnapshots(
 first:DatedGearSnapshot,second:DatedGearSnapshot):DatedGearComparison{
 const reason=first.timelineId!==second.timelineId?
  'Different faction/role timelines must not be treated as equipment evolution':
  !first.visualReferenceId||!second.visualReferenceId?
  'Both dates require a valid authored appearance before comparing equipment':
  (first.environment??'')!==(second.environment??'')?
  'Different environments are parallel variants, not confirmed chronological replacements':
  first.state==='invalid-context'||second.state==='invalid-context'?
  'Invalid snapshot context':
  '';
 if(reason)return {comparable:false,reason,first,second,changes:[]};
 const before=new Map(GEAR_CATEGORIES.flatMap(category=>
  first.visual[category].map(x=>[category+':'+x.key,x.value] as const)));
 const after=new Map(GEAR_CATEGORIES.flatMap(category=>
  second.visual[category].map(x=>[category+':'+x.key,x.value] as const)));
 const keys=[...new Set([...before.keys(),...after.keys()])].sort();
 const changes=keys.flatMap(key=>{
  const previous=before.get(key)??null,current=after.get(key)??null;
  if(previous===current)return [];
  const colon=key.indexOf(':');
  return [{category:key.slice(0,colon) as GearCategory,key:key.slice(colon+1),
   previous,current}];
 });
 return {comparable:true,reason:
  'Comparison of authored appearances only; NOT a documented change of issued equipment',
  first,second,changes};
}
