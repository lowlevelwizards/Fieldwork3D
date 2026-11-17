/** D14.1: read-only Dispatch case dossier and bounded related-operation trail.
 * Authored text is a reported lead, never confirmed game-world truth.
 * No contracts, incident IDs, mission objectives or saves are created here.
 */
import type {CampaignState,Contract} from './campaign-state.ts';
import {isDispatchPilot} from './dispatch-campaign-eligibility.ts';
import {campaignIncidentView} from './dispatch-incident-view.ts';
import {dispatchIncidentDefinition,validDispatchCase} from './dispatch-case-contract.ts';
import {selectAuthoredIncidentWording} from './briefing/incident-wording.ts';

export type DispatchLinkedOperation=Readonly<{
 contractId:string;title:string;outcome:'success'|'failure'|'unrecorded'|'unknown';
 grade:string|null;day:number|null;
}>;
export type DispatchCaseDossier=Readonly<{
 lead:string;context:string;objective:string;site:string;
 intelligence:string;uncertainty:string;
 related:readonly DispatchLinkedOperation[];
 relatedLabel:string;
}>;
const OBJECTIVES:Readonly<Record<Contract['kind'],string>>={
 clear:'Secure the designated site and clear immediate hostile opposition',
 intel:'Recover the designated intelligence package and complete extraction',
 rescue:'Reach the designated person and escort them to extraction',
 hold:'Control the marked position until the required hold is complete',
 capture:'Secure the designated target under the existing capture objective'
};
const INTELLIGENCE:Readonly<Record<Contract['intel'],string>>={
 unknown:'Layout not supplied; discover the site and its threats in the mission',
 scouted:'Exterior intelligence available; interior positions remain uncertain',
 'floor-plan':'Floor plan available; occupant and hostile positions remain unknown'
};
const MAX_LINKS=6;

/** Resolve only authoritative campaign-owned links, never infer a shared suspect,
 * location or historical claim from a follow-up contract. */
export function dispatchCaseDossier(campaign:CampaignState,
 contract:Contract):DispatchCaseDossier|null{
 if(!isDispatchPilot(campaign))return null;
 const current=campaign.contracts.find(row=>row.id===contract.id);
 if(!current)return null;
 const def=validDispatchCase(current.dispatchCase,current.kind)?
  dispatchIncidentDefinition(current.dispatchCase.incidentId):undefined;
 const wording=def?selectAuthoredIncidentWording(def,current.seed):undefined;
 const related:DispatchLinkedOperation[]=[];
 const visited=new Set<string>([current.id]);
 let parentId=current.followUpOf;
 while(parentId&&related.length<MAX_LINKS&&!visited.has(parentId)){
  visited.add(parentId);
  const parent=campaign.contracts.find(row=>row.id===parentId);
  if(!parent){
   related.push(Object.freeze({contractId:parentId,
    title:'Earlier operation record unavailable',outcome:'unknown' as const,
    grade:null,day:null}));
   break;
  }
  const report=campaign.history.find(row=>row.contractId===parent.id);
  const outcome=report?.outcome??'unrecorded';
  related.push(Object.freeze({
   contractId:parent.id,title:campaignIncidentView(campaign,parent).title,
   outcome,grade:report?.grade??null,day:report?.day??null
  }));
  parentId=parent.followUpOf;
 }
 // An archived gap, a cycle or a chain longer than the preview remains
 // explicitly partial; never present six displayed links as a full record.
 const incomplete=!!parentId&&
  (related.length>=MAX_LINKS||visited.has(parentId));
 related.reverse();
 return Object.freeze({
  lead:wording?.lead??'No detailed reported lead retained for this assignment.',
  context:wording?.context??'Only the existing contract objective is confirmed.',
  objective:OBJECTIVES[current.kind],
  site:current.dispatchCase?.archetype?.replace(/-/g,' ').toUpperCase()??
   'SITE TYPE NOT RECORDED',
  intelligence:INTELLIGENCE[current.intel],
  uncertainty:'Briefing details are provisional. Occupant numbers, intent and positions are not confirmed.',
  related:Object.freeze(related),
  relatedLabel:current.followUpOf?
   incomplete||related.some(row=>row.outcome==='unknown')?
    'RELATED OPERATION · PRIOR HISTORY INCOMPLETE':
    'RELATED OPERATION · '+related.length+' PRIOR RESPONSE'+
     (related.length===1?'':'S'):
   'NEW INCIDENT RECORD'
 });
}
