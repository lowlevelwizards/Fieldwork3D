import test from 'node:test';
import assert from 'node:assert/strict';
import {
 E0_START_SHA,E0_AREAS,E0_INVARIANTS,cssCandidates,workflowCensus,
 inspectE0,verifyE0,formatE0
} from '../scripts/verification/refactor-e0-audit.mjs';

test('E0 CSS signals compare selectors only in identical conditional contexts',()=>{
 const source=[
  '.bar{color:red}',
  '@media(max-width:600px){.bar{color:blue}.bar{color:blue}}',
  '@media(min-width:601px){.bar{color:red}}',
  '.bar{color:red}'
 ].join('\n');
 const r=cssCandidates(source);
 assert.equal(r.ruleCount,5);
 assert.equal(r.sameContextRepeatedSelectors,2);
 assert.equal(r.exactRepeatedDeclarations,2);
 assert.equal(r.candidates.find(x=>x.context.includes('max-width:600px')).occurrences,2);
 assert.match(r.caveat,/REVIEW candidates/);
});
test('E0 CI analysis distinguishes shared test references from branch-name exceptions',()=>{
 const r=workflowCensus([
  {path:'a.yml',source:'on:\n  pull_request:\nif: github.head_ref == "feature/foo"\nrun: node --test tests/x.test.mjs'},
  {path:'b.yml',source:'on:\n  workflow_dispatch:\nrun: node --test tests/x.test.mjs'},
  {path:'c.yml',source:'on:\n  push:\nrun: node --test tests/y.test.mjs'}
 ]);
 assert.equal(r.workflowCount,3);
 assert.equal(r.branchGuardCount,1);
 assert.equal(r.repeatedTestReferences,1);
 assert.deepEqual(r.topOverlap[0].workflows,['a.yml','b.yml']);
 assert.equal(r.workflows[1].manual,true);
});
test('E0 prioritized scope contains all twelve auditable domains and no extra owner',()=>{
 assert.equal(E0_START_SHA.length,40);
 assert.equal(E0_AREAS.length,12);
 assert.equal(new Set(E0_AREAS.map(x=>x.id)).size,12);
 assert.equal(new Set(E0_INVARIANTS.map(x=>x[0])).size,E0_INVARIANTS.length);
 for(const p of E0_AREAS){
  assert.ok(p.impact>=1&&p.impact<=5);
  assert.ok(p.ease>=1&&p.ease<=5);
 }
});
let cache;
const report=()=>cache??=inspectE0();
test('E0 live repository audit reuses A0/C0 and fails closed on authority drift',()=>{
 const r=report();
 assert.equal(verifyE0(r),true);
 assert.ok(r.census.typescript>1000);
 assert.ok(r.census.tests>1500);
 assert.ok(r.census.workflows>100);
 assert.ok(r.ownership.c0Owners.length>=19);
 assert.ok(r.ownership.contracts.every(x=>x.matched),JSON.stringify(r.problems));
 assert.ok(r.ownership.compatibility.unreferenced instanceof Array);
 assert.ok(r.hotspots.files.some(x=>x.path==='src/breach-motor-route.ts'));
 assert.ok(r.ui.files.some(x=>x.path==='src/breach-main.ts'));
 assert.ok(r.verification.workflows.some(x=>x.path==='.github/workflows/pages.yml'));
 assert.equal(r.behavior.physicalEvidence.fresh22.loops,1);
});
test('E0 evidence is documented as read-only and never claims a performance gain',()=>{
 const content=formatE0(report());
 assert.match(content,/Read-only: yes/);
 assert.match(content,/one suspected loop/);
 assert.match(content,/not FPS/);
 assert.match(content,/Evidence files:/);
 assert.match(content,/E0\.12/);
 assert.throws(()=>verifyE0({...report(),problems:['missing owner']}),/missing owner/);
});
