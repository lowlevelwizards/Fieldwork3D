/** Dispatch D1.1: read-only campaign-content context for existing police looks.
 * This is NOT an equipment whitelist, historical issue record, or playable
 * Dispatch campaign. Quick Play, Sandbox and existing saves never read it.
 *
 * The IDs intentionally refer only to authored, already-present references.
 * Names, organizations, periods, weapons and wardrobe remain owned by the
 * existing faction reference / timeline systems.
 */
import {FACTION_REFERENCES} from './faction-reference-catalog.ts';
import {FACTION_TIMELINES} from './faction-reference-timelines.ts';

export const CAMPAIGN_CONTENT_DOMAINS=['dispatch','operations','wasteland'] as const;
export type CampaignContentDomain=typeof CAMPAIGN_CONTENT_DOMAINS[number];
export type DispatchReferenceRole='patrol'|'tactical-police';

/** Small seed set. Expand only when a new authored look merits inclusion.
 * No speculative organizations, timestamps, assets or equipment are created.
 */
export const DISPATCH_STARTER_REFERENCE_IDS=[
 'us-swat-mp5-1995',
 'us-swat-2015',
 'us-police-polo-2020',
 'russian-omon-2002'
] as const;

export type DispatchReferenceContext=Readonly<{
 domain:'dispatch';
 referenceId:string;
 organizationId:string;
 timelineId:string;
 role:DispatchReferenceRole;
 representativeYear:number;
 /** A catalogued look is not independent evidence of issued equipment. */
 evidenceScope:'visual-reference-only';
}>;

const starterIds:ReadonlySet<string>=new Set(DISPATCH_STARTER_REFERENCE_IDS);
const referencesById=new Map(FACTION_REFERENCES.map(reference=>[reference.id,reference]));

const validRole=(role:string):role is DispatchReferenceRole=>
 role==='patrol'||role==='tactical-police';

export function dispatchReferenceContext(referenceId:string):DispatchReferenceContext|null{
 if(!starterIds.has(referenceId))return null;
 const reference=referencesById.get(referenceId);
 if(!reference||reference.organization!=='police')return null;
 const owners=FACTION_TIMELINES.filter(timeline=>
  timeline.snapshots.some(snapshot=>snapshot.referenceId===referenceId));
 if(owners.length!==1||!validRole(owners[0].role))return null;
 const timeline=owners[0];
 const snapshot=timeline.snapshots.find(x=>x.referenceId===referenceId);
 if(!snapshot||snapshot.representativeYear<reference.era.start||
  snapshot.representativeYear>reference.era.end)return null;
 return Object.freeze({
  domain:'dispatch',referenceId,
  organizationId:timeline.organizationId,timelineId:timeline.id,
  role:timeline.role,representativeYear:snapshot.representativeYear,
  evidenceScope:'visual-reference-only'
 });
}

/** Stable read-only discovery for D1; does not filter equipment selections. */
export function dispatchStarterReferenceContexts():readonly DispatchReferenceContext[]{
 return DISPATCH_STARTER_REFERENCE_IDS.flatMap(id=>{
  const context=dispatchReferenceContext(id);
  return context?[context]:[];
 });
}

/** Integrity checks are explicit so stale IDs cannot silently disappear. */
export function auditDispatchStarterReferences():readonly string[]{
 const issues:string[]=[];
 if(starterIds.size!==DISPATCH_STARTER_REFERENCE_IDS.length)
  issues.push('Duplicate Dispatch starter reference ID');
 for(const id of DISPATCH_STARTER_REFERENCE_IDS){
  if(!referencesById.has(id))issues.push('Missing authored reference: '+id);
  else if(referencesById.get(id)?.organization!=='police')
   issues.push('Non-police Dispatch reference: '+id);
  const owners=FACTION_TIMELINES.filter(timeline=>
   timeline.snapshots.some(snapshot=>snapshot.referenceId===id));
  if(owners.length!==1)
   issues.push('Expected exactly one existing timeline: '+id);
  else if(!validRole(owners[0].role))
   issues.push('Unsupported Dispatch timeline role: '+id);
  if(!dispatchReferenceContext(id))issues.push('Unresolvable Dispatch context: '+id);
 }
 return issues;
}
