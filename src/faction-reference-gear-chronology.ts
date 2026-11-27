/** FT1.5: organization -> role timeline -> recorded gear change points.
 * Every baseline and visual delta is from EXISTING appearance references;
 * evidence windows remain independent of issue, retirement and universal use.
 */
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS,
 type FactionTimeline,type TimelineOrganization}
 from './faction-reference-timelines.ts';
import {FACTION_REFERENCES,type FactionReference}
 from './faction-reference-catalog.ts';
import {HISTORICAL_ISSUE_RECORDS,type HistoricalEquipmentAssociation}
 from './faction-reference-equipment-data.ts';
import {HISTORICAL_EQUIPMENT} from './faction-reference-historical-equipment.ts';
import {resolveFactionReference} from './faction-reference-resolver.ts';
import {resolvedWardrobe} from './operator-wardrobe-data.ts';
import {LOADOUT_SLOTS} from './equipment-catalog.ts';

export const GEAR_CATEGORIES=[
 'uniform','headgear','armor','carriage','pack','footwear','weapon','accessories','markings'
] as const;
export type GearCategory=typeof GEAR_CATEGORIES[number];
export type GearSetting={key:string;value:string};
export type GearDelta={category:GearCategory;key:string;previous:string|null;current:string|null};
export type VisualChangeSnapshot={
 referenceId:string;label:string;year:number;environment:FactionReference['environment'];
 kind:'first-appearance'|'changed-appearance'|'parallel-variant'|'unchanged-appearance';
 settings:Readonly<Record<GearCategory,readonly GearSetting[]>>;
 changes:readonly GearDelta[];
 /** This documents an authored visual comparison only, not an issue change date. */
 context:'authored-visual-reference';
};
export type HistoricalResearchMarker={
 recordId:string;historicalEquipmentId:string;label:string;category:string;
 marker:'research-window-start'|'research-window-end';
 year:number;issueStatus:HistoricalEquipmentAssociation['issueStatus'];
 confidence:HistoricalEquipmentAssociation['confidence'];
 evidenceIds:readonly string[];note:string;
};
export type TimelineGearMilestone={
 year:number;visualSnapshots:readonly VisualChangeSnapshot[];
 researchMarkers:readonly HistoricalResearchMarker[];
};
export type ConsolidatedFaction={
 organization:TimelineOrganization;
 timelines:readonly FactionTimeline[];
 referenceCount:number;researchRecordCount:number;
};
const refById=new Map(FACTION_REFERENCES.map(r=>[r.id,r]));
const equipmentById=new Map(HISTORICAL_EQUIPMENT.map(r=>[r.id,r]));
const slotCategory=(slot:string):GearCategory=>
 slot==='head'||slot==='face'||slot==='eyes'||slot==='ears'?'headgear':
 slot==='armor'?'armor':
 slot==='rig'||slot==='belt'?'carriage':
 slot==='backpack'?'pack':
 slot==='feet'?'footwear':
 slot==='primary'?'weapon':'accessories';
const wardrobeCategory=(slot:string):GearCategory=>
 slot==='top'||slot==='trousers'?'uniform':
 slot==='headwear'||slot==='facewear'||slot==='eyewear'||slot==='headset'?'headgear':
 slot==='armorStyle'?'armor':
 slot==='rigStyle'||slot==='beltStyle'?'carriage':
 slot==='packStyle'?'pack':
 slot==='footwear'?'footwear':'accessories';
const categories=()=>Object.fromEntries(GEAR_CATEGORIES.map(k=>[k,{}])) as
 Record<GearCategory,Record<string,string>>;
const flatten=(r:Record<GearCategory,Record<string,string>>)=>
 Object.fromEntries(GEAR_CATEGORIES.map(category=>[
  category,Object.entries(r[category]).sort(([a],[b])=>a.localeCompare(b))
   .map(([key,value])=>({key,value}))
 ])) as Record<GearCategory,GearSetting[]>;
/** All known operator slots and appearance layers remain separately inspectable. */
export function referenceGearSettings(referenceId:string):
 Readonly<Record<GearCategory,readonly GearSetting[]>>{
 const source=refById.get(referenceId);
 if(!source)throw Error('Unknown authored reference '+referenceId);
 const resolved=resolveFactionReference(source);
 const styles=resolvedWardrobe(resolved.wardrobe,resolved.kit);
 const data=categories();
 const put=(category:GearCategory,key:string,value:unknown)=>{
  if(value!==undefined&&value!==null&&String(value).trim())
   data[category][key]=typeof value==='object'?JSON.stringify(value):String(value);
 };
 for(const slot of LOADOUT_SLOTS)
  put(slotCategory(slot),'equipment.'+slot,resolved.kit.slots[slot]);
 for(const [slot,value] of Object.entries(styles))
  put(wardrobeCategory(slot),'style.'+slot,value);
 for(const channel of ['top','trousers','armor','gear','pack'] as const){
  const category:GearCategory=channel==='top'||channel==='trousers'?'uniform':
   channel==='armor'?'armor':channel==='gear'?'carriage':'pack';
  put(category,'fabric.'+channel+'.print',resolved.wardrobe.fabricCamo?.[channel]);
  put(category,'fabric.'+channel+'.solid',resolved.wardrobe.fabricSolids?.[channel]);
 }
 const w=resolved.wardrobe;
 for(const key of ['headwearCamo','helmetCover','helmetCoverCamo',
  'headwearColor','pasgtDetails','m56Details','m56Net','policeVisorPosition',
  'policeVisorTint','policeVisorFrame'] as const){
  const value=w[key];
  if(value&&typeof value==='object')
   put('headgear','detail.'+key,JSON.stringify(value));
  else put('headgear','detail.'+key,value);
 }
 for(const key of ['helmetSetup','helmetField','beretDrape','headwearCamoRoll',
  'd2FaceMode','d2FaceSolid','d2MaskColor','d2Accessories'] as const)
  put('headgear','detail.'+key,w[key]);
 for(const key of ['m1956Variant','aliceLoad','strapSolid','pouchSolid'] as const)
  put('carriage','detail.'+key,w[key]);
 put('carriage','detail.mounts',w.mounts);
 put('carriage','detail.beltSolid',w.beltSolid);
 put('footwear','detail.footwearColor',w.footwearColor);
 put('accessories','detail.attachments',w.accessories);
 put('uniform','detail.sleeveState',w.sleeveState);
 put('uniform','detail.trouserHem',w.trouserHem);
 put('uniform','detail.topColorway',w.topColorway);
 put('uniform','detail.cuffSolid',w.cuffSolid);
 put('uniform','detail.knitSolid',w.knitSolid);
 put('accessories','detail.gloveSolid',w.gloveSolid);
 for(const [k,v] of Object.entries(w.markings??{}))put('markings','marking.'+k,v);
 for(const [slot,value] of Object.entries(resolved.weapon.weaponConfiguration.slots))
  put('weapon','attachment.'+slot,value);
 put('weapon','preset',resolved.weapon.presetId);
 put('weapon','modelFidelity',resolved.weapon.fidelity);
 return flatten(data);
}
const flattenMap=(settings:Readonly<Record<GearCategory,readonly GearSetting[]>>)=>
 new Map(GEAR_CATEGORIES.flatMap(cat=>settings[cat].map(e=>[
  cat+'.'+e.key,e.value] as const)));
export function compareReferenceGear(previousId:string,currentId:string):readonly GearDelta[]{
 const previous=flattenMap(referenceGearSettings(previousId));
 const current=flattenMap(referenceGearSettings(currentId));
 const keys=[...new Set([...previous.keys(),...current.keys()])].sort();
 return keys.flatMap(key=>{
  const before=previous.get(key)??null,after=current.get(key)??null;
  if(before===after)return [];
  const split=key.indexOf('.');
  return [{category:key.slice(0,split) as GearCategory,key:key.slice(split+1),
   previous:before,current:after}];
 });
}
export function consolidatedFactions():readonly ConsolidatedFaction[]{
 return TIMELINE_ORGANIZATIONS.map(organization=>{
  const timelines=FACTION_TIMELINES.filter(t=>t.organizationId===organization.id);
  return {organization,timelines,
   referenceCount:timelines.reduce((n,t)=>n+t.snapshots.length,0),
   researchRecordCount:timelines.reduce((n,t)=>n+t.equipment.length,0)};
 }).sort((a,b)=>a.organization.name.localeCompare(b.organization.name)||
  a.organization.id.localeCompare(b.organization.id));
}
export function timelineGearMilestones(timelineId:string):readonly TimelineGearMilestone[]{
 const timeline=FACTION_TIMELINES.find(t=>t.id===timelineId);
 if(!timeline)return [];
 const visual:VisualChangeSnapshot[]=[];
 const lastByEnvironment=new Map<FactionReference['environment'],string>();
 const seenAnyEnvironment=new Set<FactionReference['environment']>();
 const ordered=[...timeline.snapshots].sort((a,b)=>
  a.representativeYear-b.representativeYear||
  a.referenceId.localeCompare(b.referenceId));
 for(const s of ordered){
  const reference=refById.get(s.referenceId);
  if(!reference)continue;
  const prior=lastByEnvironment.get(s.environment);
  const changes=prior?compareReferenceGear(prior,s.referenceId):[];
  const kind:VisualChangeSnapshot['kind']=!prior?
   (seenAnyEnvironment.size?'parallel-variant':'first-appearance'):
   changes.length?'changed-appearance':'unchanged-appearance';
  visual.push({referenceId:reference.id,label:reference.name,
   year:s.representativeYear,environment:s.environment,kind,
   settings:referenceGearSettings(reference.id),changes,
   context:'authored-visual-reference'});
  lastByEnvironment.set(s.environment,s.referenceId);
  seenAnyEnvironment.add(s.environment);
 }
 const markers:HistoricalResearchMarker[]=[];
 for(const record of HISTORICAL_ISSUE_RECORDS.filter(r=>r.timelineId===timelineId)){
  const base={recordId:record.id,historicalEquipmentId:record.historicalEquipmentId,
   label:equipmentById.get(record.historicalEquipmentId)?.name??record.historicalEquipmentId,
   category:equipmentById.get(record.historicalEquipmentId)?.category??'unknown',
   issueStatus:record.issueStatus,confidence:record.confidence,
   evidenceIds:[...record.evidenceIds],note:record.note};
  markers.push({...base,marker:'research-window-start',year:record.startYear});
  if(record.endYear!==record.startYear)
   markers.push({...base,marker:'research-window-end',year:record.endYear});
 }
 const years=[...new Set([...visual.map(v=>v.year),...markers.map(v=>v.year)])]
  .sort((a,b)=>a-b);
 return years.map(year=>({
  year,visualSnapshots:visual.filter(v=>v.year===year),
  researchMarkers:markers.filter(m=>m.year===year).sort((a,b)=>
   a.category.localeCompare(b.category)||a.recordId.localeCompare(b.recordId))
 }));
}
