/** FT1.7A/B: source-derived coverage. Unlisted categories are UNASSESSED,
 * not complete. An unknown asset gap is NOT proof a model is absent.
 * Does not change the existing FT1.4 compatibility audit or item catalog.
 */
import {FACTION_REFERENCES,type FactionReference,type ReferenceGap}
 from './faction-reference-catalog.ts';
import {FACTION_TIMELINES} from './faction-reference-timelines.ts';
import {GEAR_CATEGORIES,type GearCategory}
 from './faction-reference-gear-chronology.ts';
import {referenceGapFidelity}
 from './faction-reference-asset-registry.ts';
import {referenceWeaponChoice} from './faction-reference-weapons.ts';

export type CoverageStatus='exact-selected'|'representative-selected'|
 'proxy-selected'|'existing-unassigned'|'needs-review'|'unassessed';
export type CoverageAction='none'|'map-existing-asset'|'inspect-substitute'|'review-model-need';
export type CoverageGap={
 id:string;label:string;importance:ReferenceGap['importance'];category:GearCategory;
 status:Exclude<CoverageStatus,'unassessed'>;
 action:CoverageAction;selectedProxy:string|null;
 existingCandidate:string|null;
 reason:string;categoryNeedsReview:boolean;modelAbsenceConfirmed:false;
};
export type ReferenceCategoryCoverage={
 referenceId:string;timelineId:string;organizationId:string;
 year:number;environment:FactionReference['environment'];
 category:GearCategory;status:CoverageStatus;gaps:readonly CoverageGap[];
};
export type CoverageMatrix={
 referenceCount:number;categoryCount:number;cells:readonly ReferenceCategoryCoverage[];
 unassessedCells:number;gapCount:number;issues:readonly string[];
};
const knownUnassigned:Readonly<Record<string,{field:'rigStyle'|'headwear';model:string}>>={
 'alice-webbing':{field:'rigStyle',model:'alice-lc2'},
 'm1956-webbing':{field:'rigStyle',model:'m1956-lce'},
 'helmet-m56':{field:'headwear',model:'ddr-m56'},
 'red-beret':{field:'headwear',model:'beret'},
 'visor-police':{field:'headwear',model:'police-helmet'}
};
/** Narrow, explicit categories beat mistaken regex classifications. */
const categoriesByGap:Readonly<Record<string,GearCategory>>={
 'unit-insignia':'markings','police-marking':'markings',
 'ukraine-identification':'markings','poland-insignia':'markings',
 'marine-8point':'headgear','bundeswehr-helmet':'headgear',
 'helmet-m56':'headgear','red-beret':'headgear','visor-police':'headgear',
 'swiss-headwear':'headgear','usmc-cover':'headgear',
 'swiss-taz-cut':'uniform','tropical-shirt':'uniform',
 'russian-smock-details':'uniform','alice-webbing':'carriage',
 'm1956-webbing':'carriage','sanf-gear':'carriage',
 'volunteer-loadout':'carriage','nsw-attachments':'accessories',
 'swat-vest':'armor','otv-armor':'armor','iotv-armor':'armor',
 'private-security-rifle':'weapon','patrol-primary':'weapon'
};
export function classifyReferenceGap(gap:ReferenceGap):{
 category:GearCategory;needsReview:boolean
}{
 const explicit=categoriesByGap[gap.id];
 if(explicit)return {category:explicit,needsReview:false};
 if(/^(ar|ak|g36|sa80|fal|galil|sig|qbz|beryl|fnc|famas|aug|mp5|k2|ag3|arx160|insas|ak5|rk|japan-rifle)-|-(family|rifle)/.test(gap.id))
  return {category:'weapon',needsReview:false};
 if(/helmet|beret|headwear/.test(gap.id))
  return {category:'headgear',needsReview:false};
 if(/armor|vest/.test(gap.id))return {category:'armor',needsReview:false};
 if(/webbing|harness|rig/.test(gap.id))return {category:'carriage',needsReview:false};
 if(/shirt|smock|uniform|trouser|cut/.test(gap.id))
  return {category:'uniform',needsReview:false};
 if(/insignia|marking|identification|badge/.test(gap.id))
  return {category:'markings',needsReview:false};
 return {category:'accessories',needsReview:true};
}
const proxy=(reference:FactionReference,category:GearCategory):string|null=>{
 if(category==='weapon'){
  const w=referenceWeaponChoice(reference.id);
  return w.presetId+' ('+w.fidelity+')';
 }
 const slot=category==='headgear'?'headwear':category==='armor'?'armorStyle':
  category==='carriage'?'rigStyle':category==='pack'?'packStyle':
  category==='uniform'?'top':category==='footwear'?'footwear':null;
 return slot?reference.styles?.[slot]??'default recipe '+slot:
  category==='markings'&&reference.markings?
   'selected markings':'no specific selected model';
};
export function assessReferenceGap(reference:FactionReference,gap:ReferenceGap):CoverageGap{
 const classification=classifyReferenceGap(gap);
 const current=proxy(reference,classification.category);
 const fidelity=referenceGapFidelity(reference,gap);
 if(fidelity==='exact')return {...classification,id:gap.id,label:gap.label,
  importance:gap.importance,status:'exact-selected',action:'none',
  selectedProxy:current,existingCandidate:null,
  reason:'The current reference explicitly selects the expected modeled item',
  categoryNeedsReview:classification.needsReview,modelAbsenceConfirmed:false};
 if(fidelity==='approximate')return {...classification,id:gap.id,label:gap.label,
  importance:gap.importance,status:'representative-selected',action:'inspect-substitute',
  selectedProxy:current,existingCandidate:null,
  reason:'The existing registry confirms only a representative appearance',
  categoryNeedsReview:classification.needsReview,modelAbsenceConfirmed:false};
 const known=knownUnassigned[gap.id];
 if(known&&reference.styles?.[known.field]!==known.model)return {
  id:gap.id,label:gap.label,importance:gap.importance,
  ...classification,status:'existing-unassigned',action:'map-existing-asset',
  selectedProxy:current,existingCandidate:known.model,
  reason:'Known modeled option exists but this reference does not select it; verify compatibility before mapping',
  categoryNeedsReview:classification.needsReview,modelAbsenceConfirmed:false};
 const weapon=classification.category==='weapon'?referenceWeaponChoice(reference.id):null;
 if(weapon?.fidelity==='proxy')return {...classification,id:gap.id,label:gap.label,
  importance:gap.importance,status:'proxy-selected',action:'review-model-need',
  selectedProxy:current,existingCandidate:null,
  reason:'An unrelated weapon preset is explicitly designated visual-only proxy; target model availability is unverified',
  categoryNeedsReview:classification.needsReview,modelAbsenceConfirmed:false};
 return {...classification,id:gap.id,label:gap.label,importance:gap.importance,
  status:'needs-review',action:'review-model-need',selectedProxy:current,
  existingCandidate:null,categoryNeedsReview:classification.needsReview,
  reason:'Authored unresolved need; no explicit evidence proves whether a suitable model already exists',
  modelAbsenceConfirmed:false};
}
const statuses:CoverageStatus[]=['needs-review','proxy-selected','existing-unassigned',
 'representative-selected','exact-selected','unassessed'];
export function buildReferenceCoverageMatrix(
 references:readonly FactionReference[]=FACTION_REFERENCES):CoverageMatrix{
 const lineage=new Map(FACTION_TIMELINES.flatMap(t=>t.snapshots.map(s=>
  [s.referenceId,{timelineId:t.id,organizationId:t.organizationId,
   year:s.representativeYear}] as const)));
 const issues:string[]=[],cells:ReferenceCategoryCoverage[]=[];
 const seen=new Set<string>();
 for(const ref of references){
  if(seen.has(ref.id))issues.push('Duplicate appearance reference '+ref.id);
  seen.add(ref.id);
  const origin=lineage.get(ref.id);
  if(!origin){issues.push('Orphan appearance reference '+ref.id);continue;}
  const assessed=ref.gaps.map(gap=>assessReferenceGap(ref,gap));
  for(const category of GEAR_CATEGORIES){
   const gaps=assessed.filter(gap=>gap.category===category);
   const status=gaps.length?
    [...gaps.map(x=>x.status)].sort((a,b)=>
     statuses.indexOf(a)-statuses.indexOf(b))[0]:'unassessed';
   cells.push({referenceId:ref.id,...origin,environment:ref.environment,
    category,status,gaps});
  }
 }
 return {referenceCount:references.length,categoryCount:GEAR_CATEGORIES.length,
  cells,unassessedCells:cells.filter(x=>x.status==='unassessed').length,
  gapCount:cells.reduce((sum,c)=>sum+c.gaps.length,0),issues};
}
