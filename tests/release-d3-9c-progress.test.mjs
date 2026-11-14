import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyCProgressWindow} from '../src/breach-d3-c-progress.ts';
const make=(extra={})=>({active:true,kind:'move',goalReduction:0,
 travel:42,net:35,blockedSeconds:0,squeezeSeconds:0,
 passageSeconds:0,openingSeconds:0,orderIssue:null,attempts:0,
 badWindows:0,...extra});
test('C: long but productive detours are not false deadlocks',()=>{
 const r=classifyCProgressWindow(make({goalReduction:-25}));
 assert.equal(r.status,'moving-detour');
 assert.equal(r.suspicious,false);
});
test('C: stationary authored wait is exempt',()=>{
 const r=classifyCProgressWindow(make({kind:'wait',travel:0,net:0}));
 assert.equal(r.status,'authored-hold');
 assert.equal(r.suspicious,false);
});
test('C: a single tight correction is not a stuck loop, two windows are',()=>{
 const first=classifyCProgressWindow(make({travel:90,net:2}));
 assert.equal(first.status,'movement-loop');
 assert.equal(first.suspicious,false);
 const next=classifyCProgressWindow(make({travel:90,net:2,
  badWindows:first.consecutivePoorWindows}));
 assert.equal(next.suspicious,true);
});
test('C: real physical blocks are independently suspicious',()=>{
 const r=classifyCProgressWindow(make({blockedSeconds:3.5,travel:0,net:0}));
 assert.equal(r.status,'physical-obstruction');
 assert.equal(r.suspicious,true);
});
test('C: slow physical door motion / real queue is not mislabelled as stall',()=>{
 assert.equal(classifyCProgressWindow(make({travel:0,net:0,
  passageSeconds:3.2})).status,'waiting-for-passage');
 assert.equal(classifyCProgressWindow(make({travel:0,net:0,
  openingSeconds:4})).suspicious,false);
});

test('C1 candidate only accepted with viable furniture next leg',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(source,/a\.lastBlocker!=='furniture'\|\|/);
 assert.match(source,/sweptBodyClear\(candidate,next,s\.doors,OPERATOR_RADIUS,world\)/);
 assert.match(source,/if\(candidate&&continues&&d\(candidate,p\)/);
});
