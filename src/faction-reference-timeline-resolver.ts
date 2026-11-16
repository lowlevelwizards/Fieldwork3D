/** FT1.0: deterministic, read-only timeline lookup. No historical interpolation.
 * 'covered' means an authored visual reference covers this year, NOT that every
 * depicted item was historically universal or independently source-verified.
 */
import {FACTION_REFERENCES,type FactionReference,type ReferenceEnvironment}
 from './faction-reference-catalog.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS,
 type FactionTimeline,type TimelineSnapshot}
 from './faction-reference-timelines.ts';

export type TimelineMatch={snapshot:TimelineSnapshot;reference:FactionReference};
export type TimelineYearResult={
 timeline:FactionTimeline;year:number;
 status:'covered'|'coverage-gap'|'outside-reference-range'|'invalid-year';
 matches:readonly TimelineMatch[];
 /** Advisory only. Nearest snapshots are never returned as matches. */
 nearest:readonly TimelineMatch[];
};
const byId=new Map(FACTION_REFERENCES.map(ref=>[ref.id,ref]));
const ordered=(a:TimelineMatch,b:TimelineMatch,year:number)=>
 Math.abs(a.snapshot.representativeYear-year)-Math.abs(b.snapshot.representativeYear-year)||
 a.snapshot.representativeYear-b.snapshot.representativeYear||
 a.reference.id.localeCompare(b.reference.id);
const pairs=(timeline:FactionTimeline):TimelineMatch[]=>
 timeline.snapshots.flatMap(snapshot=>{
  const reference=byId.get(snapshot.referenceId);
  return reference?[{snapshot,reference}]:[];
 });
export function resolveTimelineYear(timeline:FactionTimeline,year:number,
 environment?:ReferenceEnvironment):TimelineYearResult{
 if(!Number.isSafeInteger(year)||year<1800||year>2100)
  return {timeline,year,status:'invalid-year',matches:[],nearest:[]};
 const available=pairs(timeline);
 if(!available.length)
  return {timeline,year,status:'coverage-gap',matches:[],nearest:[]};
 const selected=available.filter(({reference})=>
  year>=reference.era.start&&year<=reference.era.end&&
  (!environment||reference.environment===environment)).sort((a,b)=>ordered(a,b,year));
 const nearest=available.filter(({reference})=>
  !environment||reference.environment===environment).sort((a,b)=>ordered(a,b,year)).slice(0,2);
 const earliest=Math.min(...available.map(x=>x.reference.era.start));
 const latest=Math.max(...available.map(x=>x.reference.era.end));
 return {timeline,year,
  status:selected.length?'covered':year<earliest||year>latest?
   'outside-reference-range':'coverage-gap',
  matches:selected,nearest:selected.length?[]:nearest};
}
export const timelineById=(id:string):FactionTimeline|undefined=>
 FACTION_TIMELINES.find(x=>x.id===id);
export const timelinesForOrganization=(id:string):readonly FactionTimeline[] =>
 FACTION_TIMELINES.filter(x=>x.organizationId===id);
export const timelinesForReference=(referenceId:string):readonly FactionTimeline[] =>
 FACTION_TIMELINES.filter(x=>x.snapshots.some(s=>s.referenceId===referenceId));
export type TimelineAuditIssue={timelineId:string;message:string};
export function auditFactionTimelines():{
 timelineCount:number;organizationCount:number;referenceCount:number;
 issues:TimelineAuditIssue[];
}{
 const issues:TimelineAuditIssue[]=[];
 const seenTimelines=new Set<string>(),seenRefs=new Set<string>();
 const organizations=new Map(TIMELINE_ORGANIZATIONS.map(o=>[o.id,o]));
 for(const timeline of FACTION_TIMELINES){
  if(seenTimelines.has(timeline.id))issues.push({
   timelineId:timeline.id,message:'Duplicate timeline ID'});
  seenTimelines.add(timeline.id);
  const org=organizations.get(timeline.organizationId);
  if(!org)issues.push({timelineId:timeline.id,message:'Unknown organization'});
  if(!timeline.snapshots.length)issues.push({
   timelineId:timeline.id,message:'Timeline has no snapshots'});
  let previousYear=-Infinity;
  for(const snapshot of timeline.snapshots){
   if(seenRefs.has(snapshot.referenceId))issues.push({
    timelineId:timeline.id,message:'Duplicate reference membership '+snapshot.referenceId});
   seenRefs.add(snapshot.referenceId);
   const ref=byId.get(snapshot.referenceId);
   if(!ref){issues.push({timelineId:timeline.id,
    message:'Unknown reference '+snapshot.referenceId});continue;}
   if(snapshot.representativeYear<ref.era.start||
      snapshot.representativeYear>ref.era.end)
    issues.push({timelineId:timeline.id,
     message:'Snapshot year outside authored era '+snapshot.referenceId});
   if(snapshot.environment!==ref.environment)
    issues.push({timelineId:timeline.id,
     message:'Environment mismatch '+snapshot.referenceId});
   if(org&&org.country!==ref.country)
    issues.push({timelineId:timeline.id,
     message:'Organization country mismatch '+snapshot.referenceId});
   if(snapshot.representativeYear<previousYear)
    issues.push({timelineId:timeline.id,message:'Unsorted snapshots'});
   previousYear=snapshot.representativeYear;
  }
  const evidenceIds=new Set(timeline.evidence.map(e=>e.id));
  if(evidenceIds.size!==timeline.evidence.length)
   issues.push({timelineId:timeline.id,message:'Duplicate evidence ID'});
  for(const item of timeline.equipment){
   if(item.startYear>item.endYear)
    issues.push({timelineId:timeline.id,message:'Invalid equipment period '+item.historicalEquipmentId});
   if(item.confidence==='verified'&&!item.evidenceIds.length)
    issues.push({timelineId:timeline.id,message:'Verified equipment without evidence '+item.assetId});
   for(const id of item.evidenceIds)if(!evidenceIds.has(id))
    issues.push({timelineId:timeline.id,message:'Unknown equipment evidence '+id});
  }
 }
 for(const ref of FACTION_REFERENCES)if(!seenRefs.has(ref.id))
  issues.push({timelineId:'unassigned',message:'Missing timeline membership '+ref.id});
 return {timelineCount:FACTION_TIMELINES.length,
  organizationCount:TIMELINE_ORGANIZATIONS.length,referenceCount:seenRefs.size,issues};
}
