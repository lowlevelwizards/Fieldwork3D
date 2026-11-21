import test from 'node:test';
import assert from 'node:assert/strict';
import {scanWriters,inspectR0,FROZEN_WRITERS,FROZEN_SCENARIOS,
 POLICY_NOTES,BASE_COMMIT}
 from '../scripts/verification/movement-recovery-r0-audit.mjs';

test('R0: freeze the actual 30 motor/route writers plus six related writers',()=>{
 const baseline=inspectR0();
 assert.equal(baseline.routeWriters.core,30);
 assert.equal(baseline.routeWriters.extended,36);
 assert.equal(baseline.scenarios.length,8);
 assert.equal(baseline.runtimeChanges,'none');
 assert.equal(baseline.baselineCommit,BASE_COMMIT);
 assert.deepEqual(Object.keys(FROZEN_WRITERS).sort(),[
  'src/breach-door-traversal-maneuver.ts',
  'src/breach-motor-collision.ts',
  'src/breach-motor-passage.ts',
  'src/breach-motor-route.ts',
  'src/breach-order-movement.ts'
 ]);
 for(const item of baseline.writers){
  assert.ok(POLICY_NOTES[item.policy]);
  assert.ok(item.eligibility&&item.precedence&&item.cooldown&&item.progress);
  assert.ok(item.selector&&item.evidence);
  assert.ok(item.sources.length);
 }
});

test('R0: frozen scenarios point to existing executable deterministic checks',()=>{
 const a=inspectR0();
 const ids=new Set(a.scenarios.map(x=>x.id));
 assert.equal(ids.size,FROZEN_SCENARIOS.length);
 assert.ok(ids.has('four-person-inward-outward'));
 assert.ok(ids.has('ordinary-ownership'));
 assert.ok(ids.has('provisional-progress'));
 assert.ok(ids.has('generated-stack-loop'));
});

test('R0: scanner observes multiline ternary source labels and prepend semantics',()=>{
 const allowed=new Set(['local-detour','world','intel','passage-retreat']);
 const fake=[
  "setTransientRoute(s,a,rule(s,a,{key:2}),",
  "  chosen?'world':'intel');",
  "prependTransientLeg(s,a,{x:1,y:2},'local-detour');",
  "observeTransientPrepend(s,a,pt,'passage-retreat');"
 ].join('\n');
 assert.deepEqual(scanWriters(fake,allowed),[
  {line:1,api:'set',sources:['intel','world']},
  {line:3,api:'prepend',sources:['local-detour']},
  {line:4,api:'observe',sources:['passage-retreat']}
 ]);
});

test('R0: incidental import and comment references are not writer calls',()=>{
 const allowed=new Set(['world']);
 const fake=[
  "// setTransientRoute(s,a,route,'world');",
  "import {setTransientRoute} from './f.mjs';",
  "const detail='setTransientRoute is a method';",
  "setTransientRoute(s,a,route,'world');"
 ].join('\n');
 assert.deepEqual(scanWriters(fake,allowed),[
  {line:4,api:'set',sources:['world']}
 ]);
});
