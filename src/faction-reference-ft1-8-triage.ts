/** FT1.8A: a small review queue from FT1.7's actual authored gaps.
 * Ordering is editorial triage, not proof of model absence or reviewed effort.
 */
import {buildContentCandidates,type ContentCandidate} from './faction-reference-production-candidates.ts';
export type TriageSeed={candidateId:string;reason:string;inspection:'weapon'|'headwear'|'armor';};
export const FT18_TRIAGE_SEEDS:readonly TriageSeed[]=[
 {candidateId:'gap:fnc-family',inspection:'weapon',reason:'Reconcile newly modeled FNC with Belgian proxy.'},
 {candidateId:'gap:g36-family',inspection:'weapon',reason:'Recognizable Bundeswehr rifle across authored environments.'},
 {candidateId:'gap:sa80-family',inspection:'weapon',reason:'Distinctive British bullpup silhouette.'},
 {candidateId:'british-helmet-variants',inspection:'headwear',reason:'Mk6 and Mk7 are distinct helmet variants.'},
 {candidateId:'us-armor-variants',inspection:'armor',reason:'OTV and IOTV require separate armor review.'},
 {candidateId:'gap:helmet-6b47',inspection:'headwear',reason:'Defining modern Russian headgear gap.'},
 {candidateId:'gap:armor-6b45',inspection:'armor',reason:'Significant Russian armor silhouette.'},
 {candidateId:'gap:galil-family',inspection:'weapon',reason:'R4/Galil identifies South African kit.'},
 {candidateId:'gap:ag3-variant',inspection:'weapon',reason:'Inspect existing G3 variants before new Norwegian geometry.'},
 {candidateId:'gap:swat-vest',inspection:'armor',reason:'Verify existing police armor before Dispatch expansion.'}
];
export type TriageEntry={order:number;candidate:ContentCandidate;reason:string;
 inspection:TriageSeed['inspection'];};
export function buildFT18Triage(candidates:readonly ContentCandidate[]=buildContentCandidates()):readonly TriageEntry[]{
 const byId=new Map(candidates.map(c=>[c.id,c]));
 return FT18_TRIAGE_SEEDS.flatMap((seed,index)=>{
  const candidate=byId.get(seed.candidateId);
  return candidate?[{order:index+1,candidate,reason:seed.reason,inspection:seed.inspection}]:[];
 });
}
export function ft18MissingSeedIds(candidates:readonly ContentCandidate[]=buildContentCandidates()):readonly string[]{
 const known=new Set(candidates.map(c=>c.id));
 return FT18_TRIAGE_SEEDS.filter(s=>!known.has(s.candidateId)).map(s=>s.candidateId);
}
