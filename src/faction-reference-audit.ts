/** Deterministic development report: identify reusable art bottlenecks. */
import {FACTION_REFERENCES,type FactionReference} from './faction-reference-catalog.ts';
import {resolveFactionReference} from './faction-reference-resolver.ts';
export type CoverageIssue={referenceId:string;message:string};
export type AssetDemand={id:string;label:string;referenceCount:number;
 definingCount:number;significantCount:number;referenceIds:string[]};
export function auditFactionReferences(references:readonly FactionReference[]=FACTION_REFERENCES){
 const issues:CoverageIssue[]=[];
 const seen=new Set<string>(),demands=new Map<string,AssetDemand>();
 for(const reference of references){
  if(seen.has(reference.id))issues.push({referenceId:reference.id,message:'Duplicate reference ID'});
  seen.add(reference.id);
  if(!reference.era.label||reference.era.start>reference.era.end)
   issues.push({referenceId:reference.id,message:'Invalid dated period'});
  try{
   const result=resolveFactionReference(reference);
   for(const message of result.technicalIssues)
    issues.push({referenceId:reference.id,message});
   // A missing print on one channel is an explicit limitation, not a crash.
  }catch(error){
   issues.push({referenceId:reference.id,message:String(error)});
  }
  const local=new Set<string>();
  for(const gap of reference.gaps){
   if(local.has(gap.id)){
    issues.push({referenceId:reference.id,message:'Duplicate asset gap '+gap.id});
    continue;
   }
   local.add(gap.id);
   const value=demands.get(gap.id)??{id:gap.id,label:gap.label,
    referenceCount:0,definingCount:0,significantCount:0,referenceIds:[]};
   value.referenceCount++;
   if(gap.importance==='defining')value.definingCount++;
   if(gap.importance==='significant')value.significantCount++;
   value.referenceIds.push(reference.id);
   demands.set(gap.id,value);
  }
 }
 const assetDemand=[...demands.values()].sort((a,b)=>
  b.definingCount-a.definingCount||b.referenceCount-a.referenceCount||
  b.significantCount-a.significantCount||a.id.localeCompare(b.id));
 return {referenceCount:references.length,issues,assetDemand};
}
export function referenceVisualStatus(reference:FactionReference):
 'recognizable-approximation'|'missing-defining-assets'{
 return reference.gaps.some(g=>g.importance==='defining')?
  'missing-defining-assets':'recognizable-approximation';
}
