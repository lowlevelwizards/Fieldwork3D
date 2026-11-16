/** FT1.7G: pure, deterministic planning briefs. No new models, issues,
 * gameplay writes, or source claims. All exports remain read-only.
 */
import type {ContentCandidate} from './faction-reference-production-candidates.ts';
const line=(s:string)=>s.replace(/[\r\n]+/g,' ').trim();
const safeCsv=(raw:unknown)=>{
 const value=String(raw??'');
 // Prevent spreadsheet execution when a CSV is opened as a document.
 const safe=/^[\s]*[=+@\-\t\r]/.test(value)?"'"+value:value;
 return '"'+safe.replace(/"/g,'""')+'"';
};
export type ProductionBrief={
 schemaVersion:1;candidateId:string;name:string;
 readiness:string;category:string;delivery:string;
 distinctVariants:readonly string[];authoredGapIds:readonly string[];
 affectedReferenceIds:readonly string[];affectedTimelineIds:readonly string[];
 affectedOrganizationIds:readonly string[];
 measurableImpact:ContentCandidate['metrics'];currentProxies:readonly string[];
 assessedVisualDifference:number|null;
 assessedVisualImportance:number|null;
 assessedReuse:number|null;assessedComplexity:number|null;
 reviewer:string;reviewNotes:string;reviewedOn:string|null;
 dependencies:readonly string[];reviewMissing:readonly string[];
 restrictions:readonly string[];
};
export function productionBrief(candidate:ContentCandidate):ProductionBrief{
 return {schemaVersion:1,candidateId:candidate.id,name:candidate.name,
  readiness:candidate.readiness,category:candidate.category,
  delivery:candidate.delivery,distinctVariants:[...candidate.distinctVariantIds],
  authoredGapIds:[...candidate.gapIds],
  affectedReferenceIds:[...candidate.affectedReferenceIds],
  affectedTimelineIds:[...candidate.timelineIds],
  affectedOrganizationIds:[...candidate.organizationIds],
  measurableImpact:{...candidate.metrics},currentProxies:[...candidate.currentProxies],
  assessedVisualDifference:candidate.review.silhouetteDifference,
  assessedVisualImportance:candidate.review.visualImportance,
  assessedReuse:candidate.review.reusePotential,
  assessedComplexity:candidate.review.productionComplexity,
  reviewer:candidate.review.reviewer,reviewNotes:candidate.review.notes,
  reviewedOn:candidate.review.reviewedOn,
  dependencies:[...candidate.dependencies],reviewMissing:[...candidate.reviewMissing],
  restrictions:[
   'Art planning only; not approval to create equipment or gameplay content',
   'Visual reference gaps do not prove historical issuance, retirement, rarity or complete ensembles',
   'Proxy/selected fidelity is not automatically proof that no suitable model exists',
   'Grouped candidate variants are individually distinct and require their own visual acceptance',
   'Actual geometry and integration cost require separate human review',
   'No inventory, weapon statistics, AI, mission, or save changes are specified'
  ]};
}
export function briefJson(candidate:ContentCandidate):string{
 return JSON.stringify(productionBrief(candidate),null,2)+'\n';
}
export function briefMarkdown(candidate:ContentCandidate):string{
 const b=productionBrief(candidate);
 const list=(items:readonly string[])=>items.length?
  items.map(x=>'- '+line(x)).join('\n'):'- None recorded';
 const score=(v:number|null)=>v===null?'Unreviewed':String(v)+' / 3';
 return [
  '# '+line(b.name),'',
  '**Status:** '+b.readiness+'  ',
  '**Candidate:** `'+b.candidateId+'`  ',
  '**Category:** '+b.category+'  ',
  '**Delivery:** '+b.delivery,'',
  '## Scope and affected existing reference kits','',
  'Gap IDs: '+b.authoredGapIds.join(', '),'',
  list(b.affectedReferenceIds),'',
  'Distinct variants (not interchangeable): '+(b.distinctVariants.join(', ')||'No grouped variants'),'', 
  '## Existing substitutions and measurable demand','',
  '- Unique kits: '+b.measurableImpact.uniqueKits,
  '- Unique factions: '+b.measurableImpact.uniqueOrganizations,
  '- Unique role timelines: '+b.measurableImpact.uniqueTimelines,
  '- Defining kit gaps: '+b.measurableImpact.definingKits,
  '- Significant kit gaps: '+b.measurableImpact.significantKits,
  '- Proxy or unresolved model-review kits: '+b.measurableImpact.missingOrProxyKits,
  '- Known existing option not selected: '+b.measurableImpact.existingOptionKits,'',
  'Current stand-ins: '+(b.currentProxies.join('; ')||'None identified'),'', 
  '## Review and effort (human-scored; null is not zero)','',
  '- Silhouette difference: '+score(b.assessedVisualDifference),
  '- Visual importance: '+score(b.assessedVisualImportance),
  '- Reuse potential: '+score(b.assessedReuse),
  '- Production complexity: '+score(b.assessedComplexity),
  '- Reviewer: '+(b.reviewer||'Unreviewed'),
  '- Notes: '+(b.reviewNotes||'None recorded'),
  '- Dependencies: '+(b.dependencies.join(', ')||'Unreviewed'),'', 
  '## Review still required','',list(b.reviewMissing),'',
  '## Production guardrails','',list(b.restrictions),'',
  '## Acceptance criteria (future work, not currently authorized)','',
  '- Inspect existing game models and determine whether a mapping fix suffices.',
  '- Confirm silhouette fidelity with period references before approving new geometry.',
  '- For grouped families, evaluate each historically distinct variant separately.',
  '- Keep the source/visual identity distinction; do not silently change equipment issued to an operator.',
  '- Validate final reference fidelity and regression/performance in the actual game renderer.',''
 ].join('\n');
}
export function candidateBacklogCsv(candidates:readonly ContentCandidate[]):string{
 const fields=['candidate_id','name','category','readiness','delivery',
  'gap_ids','kit_count','faction_count','timeline_count','defining_kits',
  'proxy_or_unknown_kits','mapping_fix_kits','silhouette_review',
  'reuse_review','effort_review','affected_reference_ids','review_notes'];
 const rows=candidates.map(x=>[
  x.id,x.name,x.category,x.readiness,x.delivery,x.gapIds.join(';'),
  x.metrics.uniqueKits,x.metrics.uniqueOrganizations,x.metrics.uniqueTimelines,
  x.metrics.definingKits,x.metrics.missingOrProxyKits,x.metrics.existingOptionKits,
  x.review.silhouetteDifference??'unreviewed',
  x.review.reusePotential??'unreviewed',
  x.review.productionComplexity??'unreviewed',
  x.affectedReferenceIds.join(';'),x.review.notes
 ].map(safeCsv).join(','));
 return [fields.map(safeCsv).join(','),...rows].join('\r\n')+'\r\n';
}
