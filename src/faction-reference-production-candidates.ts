/** FT1.7C–F: future art candidates, never model requests or issued gear.
 * A grouped family is a planning bucket; different variants remain DISTINCT
 * deliverables, not proof that one mesh satisfies all of its gaps.
 */
import {FACTION_REFERENCES} from './faction-reference-catalog.ts';
import {buildReferenceCoverageMatrix,type CoverageGap,
 type ReferenceCategoryCoverage,type CoverageStatus}
 from './faction-reference-coverage-matrix.ts';
import type {GearCategory} from './faction-reference-gear-chronology.ts';

export type ArtReviewValue=0|1|2|3|null;
export type CandidateReview={
 silhouetteDifference:ArtReviewValue;visualImportance:ArtReviewValue;
 reusePotential:ArtReviewValue;productionComplexity:ArtReviewValue;
 notes:string;reviewer:string;reviewedOn:string|null;
};
export type CandidateReadiness='configuration-fix'|'needs-review'|
 'art-candidate'|'blocked'|'approved-for-future-work'|'resolved';
export type CandidateDecision={
 candidateId:string;readiness:CandidateReadiness;
 review:CandidateReview;dependencies:readonly string[];
 /** Explicit permission to classify a production candidate, not to build it. */
 approvalNote:string;
};
export type CandidateMetrics={
 uniqueKits:number;uniqueTimelines:number;uniqueOrganizations:number;
 definingKits:number;significantKits:number;missingOrProxyKits:number;
 representativeKits:number;existingOptionKits:number;
};
export type ContentCandidate={
 id:string;name:string;category:GearCategory;
 gapIds:readonly string[];delivery:'single-gap'|'variant-family';
 /** A grouped family requires per-gap variants, not one automatically shared asset. */
 distinctVariantIds:readonly string[];
 affectedReferenceIds:readonly string[];timelineIds:readonly string[];
 organizationIds:readonly string[];currentProxies:readonly string[];
 gaps:readonly {referenceId:string;gap:CoverageGap}[];
 metrics:CandidateMetrics;readiness:CandidateReadiness;
 review:CandidateReview;dependencies:readonly string[];
 rationale:string;scoreKnownDemand:number;
 reviewMissing:readonly string[];
};
export type PlanningLens='visual-impact'|'coverage'|'production-efficiency';
/** Only explicit shared production families. No algorithm merges historical
 * identities based on nationality or similar labels. */
const GROUPS:readonly {id:string;name:string;gapIds:readonly string[]}[]=[
 {id:'british-helmet-variants',name:'British Mk6 and Mk7 helmet variants',
  gapIds:['helmet-mk6','helmet-mk7']},
 {id:'us-armor-variants',name:'US OTV and IOTV armor variants',
  gapIds:['otv-armor','iotv-armor']}
];
const selectedGroup=new Map(GROUPS.flatMap(g=>g.gapIds.map(id=>[id,g] as const)));
const noReview=():CandidateReview=>({
 silhouetteDifference:null,visualImportance:null,reusePotential:null,
 productionComplexity:null,notes:'',reviewer:'',reviewedOn:null
});
export const EMPTY_CANDIDATE_REVIEW:Readonly<CandidateReview>=Object.freeze(noReview());
const isScore=(x:unknown):x is ArtReviewValue=>
 x===null||x===0||x===1||x===2||x===3;
export function validateCandidateDecision(decision:CandidateDecision):readonly string[]{
 const errors:string[]=[];
 const {review}=decision;
 for(const key of ['silhouetteDifference','visualImportance',
  'reusePotential','productionComplexity'] as const)
  if(!isScore(review[key]))errors.push('Invalid review score: '+key);
 if(['art-candidate','approved-for-future-work'].includes(decision.readiness)&&
  !review.notes.trim())errors.push('Production-ready assessment needs review notes');
 if(decision.readiness==='approved-for-future-work'&&
  (!review.reviewer.trim()||!review.reviewedOn||!decision.approvalNote.trim()||
   Object.values(review).some((v)=>v===null)))
  errors.push('Approved future work requires all review scores, reviewer, date and explicit approval rationale');
 if(decision.readiness==='resolved'&&!decision.approvalNote.trim())
  errors.push('Resolution requires verified coverage explanation');
 return errors;
}
const rankStatus=(s:CoverageStatus)=>
 s==='proxy-selected'?3:s==='needs-review'?2:
 s==='representative-selected'?1:s==='existing-unassigned'?0:-1;
export function buildContentCandidates(
 decisions:readonly CandidateDecision[]=[],
 cells:readonly ReferenceCategoryCoverage[]=buildReferenceCoverageMatrix().cells
):readonly ContentCandidate[]{
 const association=new Map<string,{
  gapId:string;referenceId:string;cell:ReferenceCategoryCoverage;gap:CoverageGap
 }[]>();
 for(const cell of cells)for(const gap of cell.gaps){
  if(gap.status==='exact-selected')continue;
  const key=selectedGroup.get(gap.id)?.id??'gap:'+gap.id;
  const group=association.get(key)??[];
  group.push({gapId:gap.id,referenceId:cell.referenceId,cell,gap});
  association.set(key,group);
 }
 const decisionById=new Map(decisions.map(d=>[d.candidateId,d]));
 const candidates=[...association.entries()].map(([id,entries]):ContentCandidate=>{
  const group=GROUPS.find(x=>x.id===id);
  const gaps=entries.map(x=>({referenceId:x.referenceId,gap:x.gap}));
  const affectedReferenceIds=[...new Set(entries.map(x=>x.referenceId))].sort();
  const timelineIds=[...new Set(entries.map(x=>x.cell.timelineId))].sort();
  const organizationIds=[...new Set(entries.map(x=>x.cell.organizationId))].sort();
  const gapIds=[...new Set(entries.map(x=>x.gapId))].sort();
  const defining=new Set(entries.filter(x=>x.gap.importance==='defining')
   .map(x=>x.referenceId));
  const significant=new Set(entries.filter(x=>x.gap.importance==='significant')
   .map(x=>x.referenceId));
  const missing=new Set(entries.filter(x=>rankStatus(x.gap.status)>=2)
   .map(x=>x.referenceId));
  const representative=new Set(entries.filter(x=>x.gap.status==='representative-selected')
   .map(x=>x.referenceId));
  const existing=new Set(entries.filter(x=>x.gap.status==='existing-unassigned')
   .map(x=>x.referenceId));
  const metrics:CandidateMetrics={
   uniqueKits:affectedReferenceIds.length,uniqueTimelines:timelineIds.length,
   uniqueOrganizations:organizationIds.length,definingKits:defining.size,
   significantKits:significant.size,missingOrProxyKits:missing.size,
   representativeKits:representative.size,existingOptionKits:existing.size
  };
  const decision=decisionById.get(id);
  const problems=decision?validateCandidateDecision(decision):[];
  // Never grant a reviewed/art-ready status from invalid metadata.
  const readiness:CandidateReadiness=decision&&!problems.length?
   decision.readiness:entries.every(x=>x.gap.status==='existing-unassigned')?
    'configuration-fix':'needs-review';
  const review=decision&&!problems.length?decision.review:noReview();
  const reviewMissing=[
   ...(['silhouetteDifference','visualImportance','reusePotential',
    'productionComplexity'] as const).filter(x=>review[x]===null),
   ...problems
  ];
  const scoreKnownDemand=metrics.uniqueKits*5+metrics.definingKits*12+
   metrics.significantKits*5+metrics.missingOrProxyKits*3;
  return {id,name:group?.name??entries[0].gap.label,
   category:entries[0].gap.category,gapIds,delivery:group?'variant-family':'single-gap',
   distinctVariantIds:group?[...gapIds]:[],
   affectedReferenceIds,timelineIds,organizationIds,
   currentProxies:[...new Set(entries.map(x=>x.gap.selectedProxy)
    .filter((x):x is string=>!!x))].sort(),
   gaps,metrics,readiness,review,
   dependencies:decision&&!problems.length?[...decision.dependencies]:[],
   rationale:group?
    'Shared production-family planning only: each distinct helmet/armor type requires its own variant validation':
    'One authored gap identity across existing appearances; no confirmed model-absence claim',
   scoreKnownDemand,reviewMissing};
 });
 return candidates.sort((a,b)=>b.scoreKnownDemand-a.scoreKnownDemand||
  b.metrics.uniqueKits-a.metrics.uniqueKits||a.id.localeCompare(b.id));
}
export function prioritizeCandidates(
 candidates:readonly ContentCandidate[],lens:PlanningLens='visual-impact'
):readonly ContentCandidate[]{
 const key=(x:ContentCandidate):number=>{
  const m=x.metrics;
  if(lens==='coverage')return m.uniqueKits*100+m.uniqueOrganizations*8+m.uniqueTimelines;
  if(lens==='visual-impact')return m.definingKits*100+
   m.missingOrProxyKits*20+m.uniqueKits*3;
  // Do not pretend unknown effort is cheap; unreviewed work ranks last.
  const effort=x.review.productionComplexity,reuse=x.review.reusePotential;
  if(effort===null||reuse===null)return -1;
  return m.uniqueKits*30+m.definingKits*25+(3-effort)*15+reuse*10;
 };
 return [...candidates].sort((a,b)=>key(b)-key(a)||
  b.metrics.uniqueKits-a.metrics.uniqueKits||a.id.localeCompare(b.id));
}
export function candidateCoverageSummary(candidates:readonly ContentCandidate[]){
 const references=new Set(candidates.flatMap(x=>x.affectedReferenceIds));
 const uniqueGaps=new Set(candidates.flatMap(x=>x.gapIds));
 const originalReferences=new Set(FACTION_REFERENCES.map(x=>x.id));
 return {candidateCount:candidates.length,uniqueUnresolvedGapIds:uniqueGaps.size,
  affectedExistingReferences:[...references].filter(x=>originalReferences.has(x)).length,
  awaitingReview:candidates.filter(x=>x.reviewMissing.length).length,
  readyForProduction:candidates.filter(x=>x.readiness==='approved-for-future-work').length};
}
