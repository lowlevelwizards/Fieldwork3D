import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {FACTION_TIMELINES} from '../src/faction-reference-timelines.ts';
import {HISTORICAL_EQUIPMENT} from '../src/faction-reference-historical-equipment.ts';
import {HISTORICAL_ISSUE_RECORDS} from '../src/faction-reference-equipment-data.ts';
import {GEAR_CATEGORIES} from '../src/faction-reference-gear-chronology.ts';
import {assessReferenceGap,buildReferenceCoverageMatrix}
 from '../src/faction-reference-coverage-matrix.ts';
import {buildContentCandidates,prioritizeCandidates,candidateCoverageSummary,
 validateCandidateDecision}
 from '../src/faction-reference-production-candidates.ts';
import {productionBrief,briefMarkdown,briefJson,candidateBacklogCsv}
 from '../src/faction-reference-production-briefs.ts';
import {FT17_CANDIDATE_DECISIONS}
 from '../src/faction-reference-production-decisions.ts';

test('FT1.7 preserves all historical and visual content, covering 44 x 9 cells',()=>{
 assert.equal(FACTION_REFERENCES.length,44);
 assert.equal(FACTION_TIMELINES.length,34);
 assert.equal(HISTORICAL_EQUIPMENT.length,35);
 assert.equal(HISTORICAL_ISSUE_RECORDS.length,32);
 const m=buildReferenceCoverageMatrix();
 assert.equal(m.cells.length,44*9);
 assert.equal(m.issues.length,0);
 assert.ok(m.unassessedCells>0);
 for(const ref of FACTION_REFERENCES){
  const cells=m.cells.filter(c=>c.referenceId===ref.id);
  assert.deepEqual(cells.map(c=>c.category),[...GEAR_CATEGORIES]);
  assert.equal(cells.flatMap(c=>c.gaps).length,ref.gaps.length);
  assert.ok(cells.every(c=>c.organizationId&&c.timelineId));
 }
});
test('FT1.7 missing-model classification never fabricates model absence',()=>{
 const m=buildReferenceCoverageMatrix();
 assert.ok(m.gapCount>0);
 for(const c of m.cells)for(const g of c.gaps){
  assert.equal(g.modelAbsenceConfirmed,false);
  if(g.status==='exact-selected')assert.equal(g.action,'none');
  if(g.status==='existing-unassigned'){
   assert.equal(g.action,'map-existing-asset');
   assert.ok(g.existingCandidate);
  }
 }
 const ref=FACTION_REFERENCES.find(x=>x.id==='bundeswehr-flecktarn-2000');
 const gap=ref.gaps.find(x=>x.id==='g36-family');
 const r=assessReferenceGap(ref,gap);
 assert.equal(r.category,'weapon');
 assert.equal(r.status,'representative-selected');
 assert.equal(r.action,'inspect-substitute');
 assert.match(r.selectedProxy,/g36-service \(representative\)/);
 const alice=FACTION_REFERENCES.find(x=>x.id==='us-desert-1991');
 const synthetic={...alice,styles:{...alice.styles,rigStyle:'field-webbing'}};
 const existing=assessReferenceGap(synthetic,{id:'alice-webbing',label:'ALICE',importance:'significant'});
 assert.equal(existing.status,'existing-unassigned');
 assert.equal(existing.existingCandidate,'alice-lc2');
 assert.equal(assessReferenceGap(alice,{id:'alice-webbing',label:'ALICE',importance:'significant'}).status,'exact-selected');
});
test('FT1.7 candidate families retain distinct variants and unique kit counts',()=>{
 const all=buildContentCandidates();
 assert.deepEqual(all,buildContentCandidates());
 const unresolved=new Set(buildReferenceCoverageMatrix().cells.flatMap(c=>c.gaps)
  .filter(g=>g.status!=='exact-selected').map(g=>g.id));
 const ids=all.flatMap(x=>x.gapIds);
 assert.deepEqual(new Set(ids),unresolved);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 const british=all.find(x=>x.id==='british-helmet-variants');
 const armor=all.find(x=>x.id==='us-armor-variants');
 assert.deepEqual(british.distinctVariantIds,['helmet-mk6','helmet-mk7']);
 assert.deepEqual(armor.distinctVariantIds,['iotv-armor','otv-armor']);
 for(const c of all){
  assert.equal(c.metrics.uniqueKits,new Set(c.affectedReferenceIds).size);
  assert.equal(c.metrics.uniqueTimelines,new Set(c.timelineIds).size);
  assert.equal(c.metrics.uniqueOrganizations,new Set(c.organizationIds).size);
  assert.ok(c.metrics.definingKits<=c.metrics.uniqueKits);
  assert.ok(c.metrics.existingOptionKits<=c.metrics.uniqueKits);
  assert.equal(c.readiness==='approved-for-future-work',false);
  assert.ok(c.reviewMissing.includes('productionComplexity'));
 }
 assert.equal(candidateCoverageSummary(all).readyForProduction,0);
 assert.equal(candidateCoverageSummary(all).uniqueUnresolvedGapIds,unresolved.size);
});
test('FT1.7 future-production approval requires actual review and rationale',()=>{
 const c=buildContentCandidates()[0];
 const invalid={candidateId:c.id,readiness:'approved-for-future-work',
  review:{silhouetteDifference:null,visualImportance:null,reusePotential:null,
   productionComplexity:null,notes:'',reviewer:'',reviewedOn:null},
  dependencies:[],approvalNote:''};
 assert.ok(validateCandidateDecision(invalid).length>0);
 assert.equal(buildContentCandidates([invalid]).find(x=>x.id===c.id).readiness,'needs-review');
 const reviewed={...invalid,
  review:{silhouetteDifference:3,visualImportance:3,reusePotential:2,
   productionComplexity:2,notes:'Art review passed',reviewer:'Internal',
   reviewedOn:'2026-11-16'},approvalNote:'Explicit future production approval'};
 assert.deepEqual(validateCandidateDecision(reviewed),[]);
 assert.equal(buildContentCandidates([reviewed]).find(x=>x.id===c.id).readiness,
  'approved-for-future-work');
 assert.equal(FT17_CANDIDATE_DECISIONS.length,0);
});
test('FT1.7 prioritization keeps unknown cost unreviewed and stable',()=>{
 const all=buildContentCandidates();
 for(const lens of ['visual-impact','coverage','production-efficiency']){
  const sorted=prioritizeCandidates(all,lens);
  assert.deepEqual(sorted,prioritizeCandidates(all,lens));
  assert.deepEqual(new Set(sorted.map(x=>x.id)),new Set(all.map(x=>x.id)));
 }
 assert.ok(all.every(x=>x.review.productionComplexity===null));
});
test('FT1.7 candidate exports preserve variants and prevent spreadsheet injection',()=>{
 const list=buildContentCandidates();
 const c=list.find(x=>x.id==='british-helmet-variants');
 const brief=productionBrief(c);
 assert.equal(brief.schemaVersion,1);
 assert.equal(brief.assessedComplexity,null);
 assert.deepEqual(brief.distinctVariants,['helmet-mk6','helmet-mk7']);
 assert.ok(brief.restrictions.length>=5);
 assert.match(briefMarkdown(c),/Acceptance criteria/);
 assert.deepEqual(JSON.parse(briefJson(c)),brief);
 const csv=candidateBacklogCsv(list);
 assert.equal(csv.trim().split('\r\n').length,list.length+1);
 assert.ok(candidateBacklogCsv([{...c,name:'=IMPORTXML(A1)'}]).includes("'=IMPORTXML(A1)"));
});
test('FT1.7 planning is a separate Vite page; Studio links to it',()=>{
 const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../reference-planning.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/reference-planning.ts',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/faction-reference-browser.ts',import.meta.url),'utf8');
 assert.ok(vite.includes("referencePlanning: 'reference-planning.html'"));
 assert.ok(html.includes('reference-planning.ts'));
 assert.ok(app.includes('FT17_CANDIDATE_DECISIONS'));
 assert.ok(app.includes('candidateBacklogCsv'));
 assert.ok(studio.includes('reference-planning.html'));
 assert.ok(!app.includes("from 'three'"));
 assert.ok(!app.includes('localStorage'));
});
