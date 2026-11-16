/** Dispatch D1.1: read-only campaign-content context for existing police looks.
 * This is NOT an equipment whitelist, historical issue record, or playable
 * Dispatch campaign. Quick Play, Sandbox and existing saves never read it.
 *
 * The IDs intentionally refer only to authored, already-present references.
 * Names, organizations, periods, weapons and wardrobe remain owned by the
 * existing faction reference / timeline systems.
 */
import {FACTION_REFERENCES} from './faction-reference-catalog.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS} from './faction-reference-timelines.ts';

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
 if(owners.length!==1)return null;
 const timeline=owners[0];
 if(!validRole(timeline.role))return null;
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

/** The generic US references must never impersonate a specific agency.
 * OMON is a family of police tactical units, not a particular city detachment.
 * The existing TimelineOrganization remains the authority for display identity.
 */
export type DispatchOrganizationScope='agency-neutral'|'unit-family';
export const DISPATCH_STARTER_ORGANIZATION_SCOPES:
 Readonly<Record<string,DispatchOrganizationScope>>=Object.freeze({
 'us-police-generic':'agency-neutral',
 'russian-omon':'unit-family'
});

export type DispatchStarterRoleGroup=Readonly<{
 timelineId:string;
 label:string;
 role:DispatchReferenceRole;
 snapshots:readonly Readonly<{referenceId:string;representativeYear:number}>[];
}>;
export type DispatchStarterOrganization=Readonly<{
 id:string;
 name:string;
 country:string;
 classification:'police';
 scope:DispatchOrganizationScope;
 roles:readonly DispatchStarterRoleGroup[];
}>;

/** Group the four existing appearances through their authoritative timeline
 * owners. No new agencies, dates, gear or faction references are produced.
 */
export function dispatchStarterOrganizations():readonly DispatchStarterOrganization[]{
 const contexts=dispatchStarterReferenceContexts();
 const organizationIds=[...new Set(contexts.map(x=>x.organizationId))];
 return Object.freeze(organizationIds.flatMap(organizationId=>{
  const organization=TIMELINE_ORGANIZATIONS.find(x=>x.id===organizationId);
  const scope=DISPATCH_STARTER_ORGANIZATION_SCOPES[organizationId];
  if(!organization||organization.classification!=='police'||!scope)return [];
  const organizationContexts=contexts.filter(x=>x.organizationId===organizationId);
  const roleIds=[...new Set(organizationContexts.map(x=>x.timelineId))];
  const roles=roleIds.flatMap(timelineId=>{
   const timeline=FACTION_TIMELINES.find(x=>x.id===timelineId);
   const role=organizationContexts.find(x=>x.timelineId===timelineId)?.role;
   if(!timeline||!role)return [];
   const snapshots=organizationContexts.filter(x=>x.timelineId===timelineId)
    .map(x=>Object.freeze({
     referenceId:x.referenceId,representativeYear:x.representativeYear
    })).sort((a,b)=>a.representativeYear-b.representativeYear||
     a.referenceId.localeCompare(b.referenceId));
   return [Object.freeze({
    timelineId,label:timeline.label,role,
    snapshots:Object.freeze(snapshots)
   })];
  });
  return [Object.freeze({
   id:organization.id,name:organization.name,country:organization.country,
   classification:'police' as const,scope,roles:Object.freeze(roles)
  })];
 }));
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
  const organizationId=owners.length===1?owners[0].organizationId:null;
  const organization=TIMELINE_ORGANIZATIONS.find(x=>x.id===organizationId);
  const reference=referencesById.get(id);
  if(!organization)issues.push('Missing timeline organization: '+id);
  else {
   if(organization.classification!=='police')
    issues.push('Non-police timeline organization: '+id);
   if(reference&&organization.country!==reference.country)
    issues.push('Organization country mismatch: '+id);
   if(!DISPATCH_STARTER_ORGANIZATION_SCOPES[organization.id])
    issues.push('Unclassified starter organization scope: '+id);
  }
 }
 const grouped=dispatchStarterOrganizations();
 const groupedIds=grouped.flatMap(x=>x.roles.flatMap(y=>
  y.snapshots.map(z=>z.referenceId)));
 if(groupedIds.length!==DISPATCH_STARTER_REFERENCE_IDS.length||
  new Set(groupedIds).size!==starterIds.size||
  DISPATCH_STARTER_REFERENCE_IDS.some(id=>!groupedIds.includes(id)))
  issues.push('Organization/role grouping lost or duplicated starter references');
 return issues;
}
