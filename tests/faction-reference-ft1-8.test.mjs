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
