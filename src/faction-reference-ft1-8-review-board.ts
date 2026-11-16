/** FT1.8D: review work queue. Does not invent human observation or art approval.
 * A machine-resolved model is not equivalent to a visually accepted asset.
 */
import {buildFT18Triage} from './faction-reference-ft1-8-triage.ts';
import {inspectFT18Catalog} from './faction-reference-ft1-8-asset-checks.ts';
import {FT17_CANDIDATE_DECISIONS} from './faction-reference-production-decisions.ts';
import {validateCandidateDecision} from './faction-reference-production-candidates.ts';
export const FT18_REQUIRED_VIEWS=[
 'front at gameplay scale','side silhouette','three-quarter in Operator Studio',
 'material and attachment close-up'
] as const;
export type FT18ReviewRow={
 candidateId:string;name:string;order:number;category:string;
 status:'approved-after-review'|'needs-human-review';
 existingModel:string|null;modelAudit:string;pending:readonly string[];
 requiredViews:typeof FT18_REQUIRED_VIEWS;
};
export function ft18ReviewBoard():readonly FT18ReviewRow[]{
 const inspections=new Map(inspectFT18Catalog().map(x=>[x.candidateId,x]));
 const reviews=new Map(FT17_CANDIDATE_DECISIONS.map(x=>[x.candidateId,x]));
 return buildFT18Triage().map(row=>{
  const candidate=row.candidate;
  const audit=inspections.get(candidate.id);
  const decision=reviews.get(candidate.id);
  const valid=!!decision&&validateCandidateDecision(decision).length===0;
  const approved=valid&&decision?.readiness==='approved-for-future-work'&&
   candidate.readiness==='approved-for-future-work';
  return {
   candidateId:candidate.id,name:candidate.name,order:row.order,
   category:candidate.category,
   status:approved?'approved-after-review':'needs-human-review',
   existingModel:audit?.modelId??null,
   modelAudit:audit?.explanation??'Catalog inspection pending',
   pending:approved?[]:[
    ...candidate.reviewMissing,
    'Record dated visual comparisons from required views',
    'Verify period sources and reuse/production scope',
    'Record explicit reviewer approval'
   ],requiredViews:FT18_REQUIRED_VIEWS
  };
 });
}
