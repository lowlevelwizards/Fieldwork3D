import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFT18Triage,FT18_TRIAGE_SEEDS,ft18MissingSeedIds}
 from '../src/faction-reference-ft1-8-triage.ts';
import {buildContentCandidates} from '../src/faction-reference-production-candidates.ts';
test('FT1.8 shortlist is traceable, bounded, deterministic and not authorized production',()=>{
 const candidates=buildContentCandidates(),rows=buildFT18Triage(candidates);
 assert.deepEqual(ft18MissingSeedIds(candidates),[]);
 assert.equal(rows.length,10);
 assert.deepEqual(rows,buildFT18Triage(candidates));
 assert.deepEqual(rows.map(r=>r.candidate.id),FT18_TRIAGE_SEEDS.map(s=>s.candidateId));
 assert.ok(rows.every(r=>r.candidate.affectedReferenceIds.length>0));
 assert.ok(rows.every(r=>r.candidate.readiness!=='approved-for-future-work'));
});
test('FT1.8 never invents a missing candidate',()=>{
 const remaining=buildContentCandidates().filter(x=>x.id!=='gap:fnc-family');
 assert.deepEqual(ft18MissingSeedIds(remaining),['gap:fnc-family']);
 assert.ok(!buildFT18Triage(remaining).some(x=>x.candidate.id==='gap:fnc-family'));
});

test('FT1.8 model audit verifies real FNC/G3 presets, never assumes other models absent',async()=>{
 const {inspectFT18Catalog,ft18PotentialMappingFixes}=await import('../src/faction-reference-ft1-8-asset-checks.ts');
 const rows=inspectFT18Catalog();
 assert.equal(rows.length,10);
 assert.ok(rows.every(x=>x.verifiedModelAbsence===false));
 const fnc=rows.find(x=>x.candidateId==='gap:fnc-family');
 assert.equal(fnc.modelId,'fnc-service');
 assert.equal(fnc.status,'existing-not-selected');
 const ag3=rows.find(x=>x.candidateId==='gap:ag3-variant');
 assert.equal(ag3.modelId,'hk-g3a3');
 assert.equal(ag3.status,'representative-selected');
 assert.ok(ft18PotentialMappingFixes().every(x=>x.references.length>0));
});
