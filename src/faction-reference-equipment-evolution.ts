/** FT1.6B: one dated event per independently controlled gear setting.
 * Observed visual edits are NOT evidence of historical adoption or retirement.
 * Research windows do not imply continuous issue outside the evidenced dates.
 */
import {FACTION_TIMELINES} from './faction-reference-timelines.ts';
import {HISTORICAL_ISSUE_RECORDS} from './faction-reference-equipment-data.ts';
import {HISTORICAL_EQUIPMENT} from './faction-reference-historical-equipment.ts';
import {GEAR_CATEGORIES,timelineGearMilestones,
 type GearCategory} from './faction-reference-gear-chronology.ts';
import type {ReferenceEnvironment} from './faction-reference-catalog.ts';

export type GearEvolutionEvent={
 id:string;timelineId:string;year:number;
 environment?:ReferenceEnvironment;category:GearCategory;itemKey:string;
 kind:'visual-baseline'|'visual-change'|'research-start'|'research-end';
 /** Research identities and authored appearance keys are not interchangeable. */
 identityId:string;from:string|null;to:string|null;
 referenceId?:string;recordId?:string;
 issueStatus?:'documented-use'|'authorized'|'trial'|'planned';
 confidence?:'verified'|'tentative'|'unverified';
 sourceIds:readonly string[];note:string;
 /** Never true until a source specifically supports a historic change. */
 historicallyVerifiedChange:false;
};
export type GearEvolutionLane={
 category:GearCategory;events:readonly GearEvolutionEvent[];
};
export type GearEvolutionTimeline={
 timelineId:string;organizationId:string;
 lanes:readonly GearEvolutionLane[];allEvents:readonly GearEvolutionEvent[];
};
const itemCategory=(category:string):GearCategory=>
 category==='uniform'?'uniform':category==='headwear'?'headgear':
 category==='armor'?'armor':category==='carriage'?'carriage':
 category==='weapon'?'weapon':category==='footwear'?'footwear':'accessories';
const historicalById=new Map(HISTORICAL_EQUIPMENT.map(x=>[x.id,x]));
const evidenceById=new Map(HISTORICAL_ISSUE_RECORDS.map(x=>[x.id,x]));
const eventSort=(a:GearEvolutionEvent,b:GearEvolutionEvent)=>
 a.year-b.year||GEAR_CATEGORIES.indexOf(a.category)-GEAR_CATEGORIES.indexOf(b.category)||
 a.itemKey.localeCompare(b.itemKey)||a.kind.localeCompare(b.kind)||
 a.id.localeCompare(b.id);

export function gearEvolutionForTimeline(timelineId:string):GearEvolutionTimeline|null{
 const timeline=FACTION_TIMELINES.find(x=>x.id===timelineId);
 if(!timeline)return null;
 const events:GearEvolutionEvent[]=[];
 for(const milestone of timelineGearMilestones(timelineId)){
  for(const snapshot of milestone.visualSnapshots){
   const base={timelineId,year:milestone.year,
    environment:snapshot.environment,referenceId:snapshot.referenceId,
    sourceIds:[] as readonly string[],historicallyVerifiedChange:false as const};
   // An initial/parallel appearance defines a *complete* visual baseline.
   // Subsequent same-environment looks only emit the changed individual keys.
   if(snapshot.kind==='first-appearance'||snapshot.kind==='parallel-variant'){
    for(const category of GEAR_CATEGORIES)
     for(const item of snapshot.settings[category])
      events.push({...base,id:'visual:'+snapshot.referenceId+':'+category+':'+item.key,
       category,itemKey:item.key,kind:'visual-baseline',
       identityId:'visual:'+category+':'+item.key,
       from:null,to:item.value,note:'Authored reference appearance; not a dated historical issue claim'});
   }else{
    for(const item of snapshot.changes)
     events.push({...base,id:'visual:'+snapshot.referenceId+':'+item.category+':'+item.key,
      category:item.category,itemKey:item.key,kind:'visual-change',
      identityId:'visual:'+item.category+':'+item.key,
      from:item.previous,to:item.current,
      note:'Change between two authored same-environment looks, not proved historical adoption'});
   }
  }
  for(const marker of milestone.researchMarkers){
   const record=evidenceById.get(marker.recordId);
   if(!record)continue;
   const eq=historicalById.get(record.historicalEquipmentId);
   const category=itemCategory(eq?.category??'other');
   events.push({id:'research:'+record.id+':'+marker.marker,
    timelineId,year:milestone.year,category,
    itemKey:record.historicalEquipmentId,identityId:record.historicalEquipmentId,
    kind:marker.marker==='research-window-start'?'research-start':'research-end',
    from:null,to:null,recordId:record.id,sourceIds:[...record.evidenceIds],
    issueStatus:record.issueStatus,confidence:record.confidence,
    historicallyVerifiedChange:false,
    note:record.note+' Research-window boundary only; not a fielding or withdrawal event.'});
  }
 }
 const allEvents=events.sort(eventSort);
 return {timelineId,organizationId:timeline.organizationId,
  lanes:GEAR_CATEGORIES.map(category=>({
   category,events:allEvents.filter(x=>x.category===category)
  })),allEvents};
}
/** A missing research event is unknown, not retirement. No event is auto-carried
 * into an unresearched year. Preserve independent category lanes. */
export function gearEventsAtYear(timelineId:string,year:number):
 readonly GearEvolutionEvent[]{
 const result=gearEvolutionForTimeline(timelineId);
 return Number.isSafeInteger(year)&&result?
  result.allEvents.filter(x=>x.year===year):[];
}
