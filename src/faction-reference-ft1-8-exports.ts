/** FT1.8F: deterministic read-only review and proposed production exports. */
import {ft18ReviewBoard} from './faction-reference-ft1-8-review-board.ts';
import {FT18_FIRST_ASSET_SCOPE,ft18FirstAssetReadiness} from './faction-reference-ft1-8-first-asset.ts';
const csv=(v:unknown)=>{
 const raw=String(v??'');
 const safe=/^[\s]*[=+@\-\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
};
export function ft18ReviewCsv(){
 const rows=ft18ReviewBoard().map(x=>[
  x.order,x.candidateId,x.name,x.category,x.status,x.existingModel??'',
  x.modelAudit,x.pending.join('; '),x.requiredViews.join('; ')
 ]);
 return [['rank','candidate_id','name','category','review_status','known_model',
  'catalog_audit','pending_evidence','required_views'],...rows]
  .map(row=>row.map(csv).join(',')).join('\r\n')+'\r\n';
}
export function ft18ReviewJson(){
 return JSON.stringify({schemaVersion:1,kind:'FT1.8-read-only-review',
  reviews:ft18ReviewBoard(),firstAsset:FT18_FIRST_ASSET_SCOPE,
  readiness:ft18FirstAssetReadiness()},null,2)+'\n';
}
export function ft18FirstAssetMarkdown(){
 const x=FT18_FIRST_ASSET_SCOPE;
 const lines=(items:readonly string[])=>items.map(s=>'- '+s.replace(/[\r\n]+/g,' '));
 const status=ft18FirstAssetReadiness();
 return [
  '# '+x.title,'','**Candidate:** '+x.candidateId,
  '**Status:** '+x.state+'; authorization '+(status.authorized?'granted':'BLOCKED'),
  '',x.rationale,'',
  '## Variant selection required',...lines(x.requiredVariants),'',
  '## Deliverables',...lines(x.deliverables),'',
  '## Design and integration constraints',...lines(x.constraints),'',
  '## Visual acceptance',...lines(x.visualAcceptance),'',
  '## Technical acceptance',...lines(x.technicalAcceptance),'',
  '## Human review blockers',...lines(x.blockers),'',
  '## Out of scope',...lines(x.outOfScope),''
 ].join('\n');
}
