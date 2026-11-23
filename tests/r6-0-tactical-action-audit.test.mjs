import test from 'node:test';
import assert from 'node:assert/strict';
import {
 R60_STAGE,R60_READ_ONLY,R60_ORDER_OWNERS,R60_INTERACTIONS,
 R60_CLASSES,R60_BOUNDARIES,R60_REPEATED_POLICY,R60_OUT_OF_BAND,
 declaredActionTypes,inspectR60,verifyR60,renderR60
} from '../scripts/verification/r6-0-tactical-action-audit.mjs';

test('R6.0 discriminator reader accepts multiline unions without importing the game',()=>{
 const source=[
  "export type PlanKind='move'|",
  " 'interact';",
  "export type PlanNode={",
  " interaction?:'follow-civilian'|",
  " 'restrain-civilian';",
  " method?:'open';",
  "};"
 ].join('\n');
 assert.deepEqual(declaredActionTypes(source),{
  kinds:['move','interact'],
  interactions:['follow-civilian','restrain-civilian']
 });
 assert.throws(()=>declaredActionTypes('export type PlanKind=string;'),
  /missing PlanNode discriminants/);
});

test('R6.0 inventories every authored kind and subtype exactly once',()=>{
 const report=inspectR60();
 assert.equal(R60_STAGE,'R6.0');
 assert.equal(R60_READ_ONLY,true);
 assert.equal(verifyR60(report),true,JSON.stringify(report.problems));
 assert.equal(report.declared.kinds.length,15);
 assert.equal(report.declared.interactions.length,17);
 assert.equal(new Set(report.declared.kinds).size,15);
 assert.equal(new Set(report.declared.interactions).size,17);
 assert.deepEqual(report.declared.kinds.slice().sort(),
  Object.keys(R60_ORDER_OWNERS).sort());
 assert.deepEqual(report.declared.interactions.slice().sort(),
  Object.keys(R60_INTERACTIONS).sort());
 assert.ok(report.orders.every(x=>x.handlerEvidence));
 assert.ok(report.interactions.every(x=>x.plannerEvidence&&x.executionEvidence));
});

test('R6.0 preserves voice versus physical contact and out-of-band boundaries',()=>{
 assert.deepEqual([...R60_CLASSES].sort(),
  ['object-contact','person-contact','release','voice']);
 const voice=['follow-civilian','stop-following-civilian',
  'challenge-suspect','escort-suspect','stop-escorting-suspect'];
 const physical=['secure-civilian','restrain-civilian',
  'restrain-suspect','search-suspect'];
 for(const name of voice)
  assert.equal(R60_INTERACTIONS[name].class,'voice',name);
 for(const name of physical)
  assert.equal(R60_INTERACTIONS[name].class,'person-contact',name);
 assert.ok(R60_OUT_OF_BAND.some(x=>x.name.includes('automatic optional intel')));
 assert.ok(R60_BOUNDARIES.some(x=>x[0]==='physical motor'));
 assert.ok(R60_BOUNDARIES.some(x=>x[0]==='replay'));
 assert.ok(R60_REPEATED_POLICY.some(x=>x.id==='civilian-voice-reach'));
});

test('R6.0 reports all action layers while keeping unproven candidates explicit',()=>{
 const report=inspectR60();
 assert.ok(report.boundaries.length>=18);
 assert.ok(report.boundaries.every(x=>x.observed));
 assert.ok(report.duplication.every(x=>x.matches.every(y=>y.found)));
 assert.match(report.caveat,/Static source evidence only/);
 const markdown=renderR60(report);
 assert.match(markdown,/Read-only: yes/);
 assert.match(markdown,/17/);
 assert.match(markdown,/Existing execution and feedback boundaries/);
 assert.match(markdown,/candidates, not defects/);
 assert.match(markdown,/No action execution/);
 assert.match(markdown,/Audit problems: 0/);
 assert.throws(()=>verifyR60({...report,problems:['removed owner']}),
  /removed owner/);
 assert.throws(()=>verifyR60({...report,readOnly:false}),/not read-only/);
});
