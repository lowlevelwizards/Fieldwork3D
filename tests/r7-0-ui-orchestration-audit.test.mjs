import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {
 R70_BASE,R70_OWNERS,R70_MODES,R70_STAGES,R70_EDGES,
 sourceUiSignals,inspectR70,verifyR70,formatR70,writeR70
} from '../scripts/verification/r7-0-ui-orchestration-audit.mjs';

test('R7.0 AST counts actual calls, never fake mentions in comments or strings',()=>{
 const fixture=[
  '// updateHud(); ui.renderSession({});',
  'const quote="updateHud(); ui.renderSession({});";',
  'function change(){ updateHud(); ui.renderSession({}); recorder.capturePlanning(state); }',
  'const callback=()=> { this.preview?.dispose(); };'
 ].join('\n');
 const rows=sourceUiSignals(fixture,'fixture.ts');
 assert.deepEqual(rows.map(x=>x.callee),
  ['updateHud','renderSession','capturePlanning','dispose']);
 assert.deepEqual(rows.map(x=>x.line),[3,3,3,4]);
 assert.deepEqual(rows.map(x=>x.caller),['change','change','change','callback']);
 assert.equal(rows[1].expression,'ui.renderSession');
 assert.equal(rows[3].expression,'this.preview?.dispose');
});
test('R7.0 explicit authority and mode matrix remains a distinct owner ledger',()=>{
 assert.equal(R70_BASE.length,40);
 assert.equal(new Set(R70_OWNERS.map(x=>x.id)).size,R70_OWNERS.length);
 assert.equal(new Set(R70_OWNERS.map(x=>x.authority)).size,R70_OWNERS.length);
 assert.ok(R70_OWNERS.length>=16);
 for(const owners of Object.values(R70_MODES))
  for(const id of owners)assert.ok(R70_OWNERS.some(x=>x.id===id),id);
 assert.deepEqual(R70_STAGES.map(x=>x.id),
  ['R7.1','R7.2','R7.3','R7.4','R7.5']);
 assert.ok(R70_EDGES.length>=12);
});
let cached;
const report=()=>cached??=inspectR70();
test('R7.0 live source census protects real refresh, bookkeeping and shared gallery edges',()=>{
 const r=report();
 assert.equal(verifyR70(r),true,r.problems.join('\n'));
 assert.equal(r.readOnly,true);
 assert.equal(r.e0Area,'E0.04');
 assert.ok(r.c0.owners>=19);
 assert.deepEqual(r.refresh.cadence.scheduledMs,
  {planning:120,running:180,terminal:750});
 assert.ok(r.refresh.orchestratorCalls.some(x=>x.callee==='observeSessionLifecycle'));
 assert.ok(r.refresh.entrypoints.some(x=>x.path==='src/breach-session-lifecycle-observer.ts'&&
  x.callee==='capturePlanning'&&x.sites.length===1));
 assert.ok(r.refresh.entrypoints.some(x=>x.path==='src/breach-session-lifecycle-observer.ts'&&
  x.callee==='recordCompletedOperation'&&x.sites.length===1));
 assert.ok(r.refresh.orchestratorCalls.some(x=>x.callee==='renderSession'));
 assert.ok(r.equipment.galleryCallers.every(x=>x.sites.length>0));
 assert.ok(r.lifecycle.files.some(x=>x.path.includes('campaign-outfitter-gallery')&&
  x.observed.some(s=>s.callee==='disconnect')));
 assert.ok(r.owners.find(x=>x.id==='quick-ops').counts.refresh>0);
 assert.ok(r.owners.every(x=>x.markers.every(m=>m.found)));
});
test('R7.0 verification fails closed on missing owner, changed timer and observed drift',()=>{
 const r=report();
 assert.throws(()=>verifyR70({...r,readOnly:false}),/read-only/);
 assert.throws(()=>verifyR70({...r,sources:1}),/Missing owner evidence/);
 assert.throws(()=>verifyR70({...r,problems:['Missing contract']}),/Missing contract/);
 assert.throws(()=>verifyR70({...r,refresh:{...r.refresh,
  cadence:{...r.refresh.cadence,observed:false}}}),/120\/180\/750ms/);
});
test('R7.0 writes bounded, source-located evidence and an explicit measured handoff',()=>{
 const r=report(),rendered=formatR70(r);
 for(const token of ['Read-only','capturePlanning','recordCompletedOperation',
  'R7.1','R7.5','No runtime frequency measured',
  'No unmeasured leak','Audit problems: 0'])assert.ok(rendered.includes(token),token);
 const dir=mkdtempSync(join(tmpdir(),'r7-0-'));
 try{
  writeR70(r,dir);
  for(const name of ['audit.json','ownership.json','refresh.json',
   'equipment.json','lifecycle.json','handoff.md'])
   assert.ok(existsSync(join(dir,name)),name);
  const disk=JSON.parse(readFileSync(join(dir,'audit.json'),'utf8'));
  assert.equal(disk.stage,'R7.0');
  assert.equal(disk.readOnly,true);
  assert.ok(disk.owners.every(x=>x.hash.length===64));
  assert.deepEqual(disk.problems,[]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('R7.0 documented scope forbids production edits and unmeasured speed claims',()=>{
 const doc=readFileSync(resolve('docs/r7-0-ui-orchestration-scope-20261123.md'),'utf8');
 assert.match(doc,/evidence-only/);
 assert.match(doc,/R7\.0\.09/);
 assert.match(doc,/R7\.1.*R7\.5/s);
 assert.match(doc,/not.*(FPS|DOM|input latency)/i);
 assert.match(doc,/exact-head/);
 assert.match(doc,/No production import of the audit/);
});
