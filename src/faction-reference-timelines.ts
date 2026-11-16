/** FT1.0: dated appearance reference lineages, not playable factions or item-issue rules.
 * Reference kits remain authoritative for appearance; timeline membership is additive.
 * A snapshot's representativeYear is a catalog index, NOT a universal service date.
 */
import {FACTION_REFERENCES,type ReferenceEnvironment,type ReferenceOrganization}
 from './faction-reference-catalog.ts';
import {HISTORICAL_ISSUE_RECORDS,type HistoricalEquipmentAssociation}
 from './faction-reference-equipment-data.ts';
import {HISTORICAL_EVIDENCE,type HistoricalEvidence}
 from './faction-reference-evidence.ts';

/** Compatibility aliases: FT1.1 separates historical evidence from game assets. */
export type TimelineEvidence=HistoricalEvidence;
export type TimelineEquipmentAssociation=HistoricalEquipmentAssociation;
export type TimelineOrganization={
 id:string; name:string; country:string; classification:ReferenceOrganization;
 /** Successor relationships must be explicitly researched, never inferred from country. */
 predecessorIds?:readonly string[];
};
export type TimelineSnapshot={
 referenceId:string;representativeYear:number;
 environment:ReferenceEnvironment;
};
export type FactionTimeline={
 id:string;organizationId:string;label:string;role:string;
 snapshots:readonly TimelineSnapshot[];
 /** Empty until researched; do not manufacture an issue history from appearance presets. */
 equipment:readonly TimelineEquipmentAssociation[];
 evidence:readonly TimelineEvidence[];
};
type Definition={
 id:string;organizationId:string;organizationName:string;label:string;role:string;
 refs:readonly (readonly [string,number])[];
};
const d=(id:string,organizationId:string,organizationName:string,label:string,
 role:string,refs:readonly (readonly [string,number])[]):Definition=>
 ({id,organizationId,organizationName,label,role,refs});

/** Every existing dated reference appears once. Environment-specific kits are peers,
 * not automatic successor equipment; agencies and dissolved states stay separate.
 */
const DEFINITIONS:readonly Definition[]=[
 d('us-army-infantry','us-army','United States Army','Conventional infantry','infantry',[
  ['us-army-m81-1990',1990],['us-desert-1991',1991],
  ['us-army-dcu-2003',2003],['us-army-ucp-2010',2010],['us-army-ocp-2019',2019]]),
 d('us-army-recon','us-army','United States Army','Reconnaissance references','reconnaissance',
  [['us-army-erdl-1970',1970]]),
 d('usmc-field','usmc','United States Marine Corps','Field infantry','infantry',
  [['usmc-woodland-2005',2005],['usmc-desert-2010',2010]]),
 d('us-naval-special','us-naval-special','US Naval Special Warfare','Special operations','special-operations',
  [['us-navy-aor1-2014',2014]]),
 d('bundeswehr-field','bundeswehr','Bundeswehr','Field infantry','infantry',
  [['bundeswehr-flecktarn-2000',2000],['bundeswehr-tropentarn-2010',2010]]),
 d('russian-army-field','russian-army','Russian Army','Field infantry','infantry',
  [['russian-flora-2000',2000],['russian-emr-2015',2015]]),
 d('russian-recon','russian-army','Russian Army','Reconnaissance','reconnaissance',
  [['russian-gorka-leto-2010',2010]]),
 d('russian-omon','russian-omon','Russian MVD / OMON','Police tactical','tactical-police',
  [['russian-omon-2002',2002]]),
 d('british-army-field','british-army','British Army','Field infantry','infantry',
  [['british-dpm-1995',1995],['british-mtp-2015',2015]]),
 d('nva-field','east-german-nva','East German NVA','Field infantry','infantry',
  [['nva-strichtarn-1980',1980]]),
 d('sadf-field','south-african-sadf','South African Defence Force (historical)','Field infantry','infantry',
  [['sadf-nutria-1985',1985]]),
 d('sandf-field','south-african-sandf','South African National Defence Force','Field infantry','infantry',
  [['sandf-s2000-2015',2015]]),
 d('swedish-field','swedish-forces','Swedish Armed Forces','Field infantry','infantry',
  [['swedish-m90-2000',2000]]),
 d('rhodesian-field','rhodesian-security','Rhodesian Security Forces (historical)','Field forces','infantry',
  [['rhodesian-brushstroke-1975',1975]]),
 d('ukrainian-field','ukrainian-forces','Armed Forces of Ukraine','Field infantry','infantry',
  [['ukraine-mm14-2022',2022]]),
 d('ukrainian-territorial','ukrainian-territorial','Ukrainian Territorial Defense','Territorial defense','territorial',
  [['ukraine-territorial-2022',2022]]),
 d('pla-field','chinese-pla','People\'s Liberation Army','Field infantry','infantry',
  [['pla-xingkong-2021',2021]]),
 d('swiss-field','swiss-army','Swiss Army','Field infantry','infantry',
  [['swiss-alpenflage-1980',1980],['swiss-taz90-2005',2005]]),
 d('finnish-field','finnish-forces','Finnish Defence Forces','Field infantry','infantry',
  [['finnish-m05-2015',2015]]),
 d('polish-field','polish-forces','Polish Armed Forces','Field infantry','infantry',
  [['polish-pantera-2010',2010]]),
 d('italian-field','italian-army','Italian Army','Field infantry','infantry',
  [['italian-vegetato-2015',2015]]),
 d('belgian-field','belgian-army','Belgian Army','Field infantry','infantry',
  [['belgian-jigsaw-1995',1995]]),
 d('french-field','french-army','French Army','Field infantry','infantry',
  [['french-cce-2005',2005]]),
 d('norwegian-field','norwegian-army','Norwegian Army','Field infantry','infantry',
  [['norwegian-m98-2005',2005]]),
 d('greek-field','greek-army','Greek Army','Field infantry','infantry',
  [['greek-lizard-1990',1990]]),
 d('jgsdf-field','jgsdf','Japan Ground Self-Defense Force','Field infantry','infantry',
  [['jgsdf-type2-2010',2010]]),
 d('indian-field','indian-army','Indian Army','Field infantry','infantry',
  [['indian-digital-2023',2023]]),
 d('australian-field','australian-army','Australian Army','Field infantry','infantry',
  [['australian-dpcu-2004',2004]]),
 d('canadian-field','canadian-army','Canadian Army','Field infantry','infantry',
  [['canada-cadpat-tw-2012',2012]]),
 d('rok-field','rok-army','Republic of Korea Army','Field infantry','infantry',
  [['korean-granite-2023',2023]]),
 d('indonesian-special','indonesian-kopassus','Indonesian Kopassus','Special operations','special-operations',
  [['indonesian-kopassus-1990',1990]]),
 d('us-swat-archetype','us-police-generic','United States police (agency-neutral)','SWAT archetype','tactical-police',
  [['us-swat-mp5-1995',1995],['us-swat-2015',2015]]),
 d('us-police-patrol','us-police-generic','United States police (agency-neutral)','Patrol archetype','patrol',
  [['us-police-polo-2020',2020]]),
 d('iraq-private-security','iraq-private-security','Private security (Iraq setting)','Contract security','private-security',
  [['private-security-iraq-2007',2007]])
];
const referenceById=new Map(FACTION_REFERENCES.map(r=>[r.id,r]));
export const FACTION_TIMELINES:readonly FactionTimeline[]=DEFINITIONS.map(def=>({
 id:def.id,organizationId:def.organizationId,label:def.label,role:def.role,
 snapshots:def.refs.map(([referenceId,representativeYear])=>({
  referenceId,representativeYear,
  environment:referenceById.get(referenceId)?.environment??'mixed'
 })),
 equipment:HISTORICAL_ISSUE_RECORDS.filter(a=>a.timelineId===def.id),
 evidence:HISTORICAL_EVIDENCE.filter(e=>HISTORICAL_ISSUE_RECORDS.some(a=>
  a.timelineId===def.id&&a.evidenceIds.includes(e.id)))
}));
/** First definition owns broad organization classification; subunits may differ. */
const organizationRegistry=new Map<string,TimelineOrganization>();
for(const def of DEFINITIONS){
 if(organizationRegistry.has(def.organizationId))continue;
 const first=referenceById.get(def.refs[0]?.[0]??'');
 organizationRegistry.set(def.organizationId,{
  id:def.organizationId,name:def.organizationName,
  country:first?.country??'',classification:first?.organization??'military'
 });
}
export const TIMELINE_ORGANIZATIONS:readonly TimelineOrganization[]=
 [...organizationRegistry.values()];
export const factionTimeline=(id:string):FactionTimeline|undefined=>
 FACTION_TIMELINES.find(x=>x.id===id);
export const timelineOrganization=(id:string):TimelineOrganization|undefined=>
 TIMELINE_ORGANIZATIONS.find(x=>x.id===id);
export const timelineForReference=(referenceId:string):FactionTimeline|undefined=>
 FACTION_TIMELINES.find(t=>t.snapshots.some(s=>s.referenceId===referenceId));
