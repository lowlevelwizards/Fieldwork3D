import test from 'node:test';
import assert from 'node:assert/strict';
import {D318_FRESH_22,D318_FRESH_ID}
 from '../scripts/lib/d3-18-eleventh-fresh22.mjs';
import {D315B4_HOLDOUT_22}
 from '../scripts/lib/d3-15b4-tenth-blind22.mjs';
test('D3.18D: 22 immutable independent seeds cover every archetype at both scales',()=>{
 assert.equal(D318_FRESH_22.length,22);
 assert.match(D318_FRESH_ID,/d3-18-eleventh-fresh22/);
 assert.equal(new Set(D318_FRESH_22.map(x=>x.seed)).size,22);
 const previous=new Set(D315B4_HOLDOUT_22.map(x=>x.seed));
 for(let i=0;i<22;i++){
  assert.equal(D318_FRESH_22[i].index,i);
  assert.equal(D318_FRESH_22[i].scale,i<11?'small':'standard');
  assert.ok(!previous.has(D318_FRESH_22[i].seed));
  assert.equal(D318_FRESH_22[i].archetype,D318_FRESH_22[i%11].archetype);
  assert.equal(Object.isFrozen(D318_FRESH_22[i]),true);
 }
 assert.equal(Object.isFrozen(D318_FRESH_22),true);
});
