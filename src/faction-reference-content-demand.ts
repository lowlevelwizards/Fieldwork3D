/** FT1.4A: a demand queue, NOT an equipment catalog or production ticket.
 * Only indexes existing 44 appearance references and declared asset gaps.
 * Counts indicate kit benefit, never historical issuance or rarity.
 */
import {FACTION_REFERENCES,type FactionReference,type ReferenceGap}
 from './faction-reference-catalog.ts';
import {referenceGapFidelity,type ReferenceGapFidelity}
 from './faction-reference-asset-registry.ts';
import {referenceWeaponChoice} from './faction-reference-weapons.ts';

export type ContentDemandCategory='weapon'|'helmet'|'armor'|'carriage'|'clothing'|'identity'|'other';
export type NoveltyAssessment='high-likely'|'medium-likely'|'low-likely'|'needs-review';
export type DemandItem={
 id:string;label:string;category:ContentDemandCategory;
 affectedReferenceIds:readonly string[];affectedKitCount:number;
 missingKitCount:number;approximateKitCount:number;
 definingCount:number;significantCount:number;
 /** Observed fallback representation, not a claim of equal shape or equipment. */
 currentProxies:readonly string[];
 /** Gap-based heuristic; human visual silhouette review still required. */
 noveltyAssessment:NoveltyAssessment;
 noveltyRequiresReview:true;
 /** Rank for art triage, not an estimated cost or historical frequency. */
 priorityScore:number;
};
const categoryOf=(id:string):ContentDemandCategory=>{
 if(/family|rifle|weapon|carbine|mp5|galil|ak5|g36|sa80|qbz|insas|beryl/.test(id))
  return 'weapon';
 if(/helmet|headwear|beret|cap|visor|boonie/.test(id))return 'helmet';
 if(/armor|armour|vest|otv|iotv|plate/.test(id))return 'armor';
 if(/webbing|rig|plce|alice|lce|pouch|pack|harness|load/.test(id))
  return 'carriage';
 if(/shirt|uniform|tropical|trouser|jacket|cut/.test(id))return 'clothing';
 if(/insignia|marking|identification|badge|patch|unit/.test(id))
  return 'identity';
 return 'other';
};
const proxyFor=(reference:FactionReference,gap:ReferenceGap)=>{
 const category=categoryOf(gap.id);
 if(category==='weapon'){
  const weapon=referenceWeaponChoice(reference.id);
  return 'visual rifle: '+weapon.presetId+' ('+weapon.fidelity+')';
 }
 if(category==='helmet')return 'headwear: '+(reference.styles?.headwear??'default');
 if(category==='armor')return 'armor: '+(reference.styles?.armorStyle??'default');
 if(category==='carriage')return 'rig: '+(reference.styles?.rigStyle??'default');
 if(category==='clothing')return 'garment: '+(reference.styles?.top??'default');
 return 'no specific modeled replacement identified';
};
export function prioritizeContentDemand(references:readonly FactionReference[]=FACTION_REFERENCES):
 readonly DemandItem[]{
 const map=new Map<string,{
  label:string;affected:Set<string>;missing:Set<string>;approximate:Set<string>;
  defining:Set<string>;significant:Set<string>;proxies:Set<string>;
 }>();
 for(const ref of references){
  for(const gap of ref.gaps){
   const fidelity:ReferenceGapFidelity=referenceGapFidelity(ref,gap);
   if(fidelity==='exact')continue;
   const row=map.get(gap.id)??{
    label:gap.label,affected:new Set<string>(),missing:new Set<string>(),
    approximate:new Set<string>(),defining:new Set<string>(),
    significant:new Set<string>(),proxies:new Set<string>()
   };
   row.affected.add(ref.id);
   if(fidelity==='missing')row.missing.add(ref.id);
   else row.approximate.add(ref.id);
   if(gap.importance==='defining')row.defining.add(ref.id);
   if(gap.importance==='significant')row.significant.add(ref.id);
   row.proxies.add(proxyFor(ref,gap));
   map.set(gap.id,row);
  }
 }
 return [...map.entries()].map(([id,row]):DemandItem=>{
  const affectedKitCount=row.affected.size;
  const missingKitCount=row.missing.size;
  const approximateKitCount=row.approximate.size;
  const definingCount=row.defining.size;
  const significantCount=row.significant.size;
  // Not geometric distance: confidence in the lack of a recognizable
  // alternative, based on authored gap severity and chosen reference fidelity.
  const noveltyAssessment:NoveltyAssessment=
   definingCount>0&&missingKitCount>0?'high-likely':
   missingKitCount>0&&significantCount>0?'medium-likely':
   approximateKitCount>0&&!missingKitCount?'low-likely':'needs-review';
  const priorityScore=affectedKitCount*5+missingKitCount*3+
   definingCount*12+significantCount*5+
   (noveltyAssessment==='high-likely'?16:
    noveltyAssessment==='medium-likely'?8:0);
  return {id,label:row.label,category:categoryOf(id),
   affectedReferenceIds:[...row.affected].sort(),
   affectedKitCount,missingKitCount,approximateKitCount,
   definingCount,significantCount,currentProxies:[...row.proxies].sort(),
   noveltyAssessment,noveltyRequiresReview:true,priorityScore};
 }).sort((a,b)=>b.priorityScore-a.priorityScore||
  b.affectedKitCount-a.affectedKitCount||a.id.localeCompare(b.id));
}
export function contentDemandSummary(references:readonly FactionReference[]=FACTION_REFERENCES){
 const queue=prioritizeContentDemand(references);
 return {referenceCount:references.length,uniqueUnresolvedNeeds:queue.length,
  affectedReferences:new Set(queue.flatMap(item=>item.affectedReferenceIds)).size,
  queue};
}
