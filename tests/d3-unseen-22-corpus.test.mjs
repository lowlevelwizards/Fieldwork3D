import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {D3_HOLDOUT_22,D3_HOLDOUT_22_ID}
 from '../scripts/lib/d3-holdout-22-manifest.mjs';

test('holdout is exactly 22 new, distinct, frozen map seeds',()=>{
 assert.equal(D3_HOLDOUT_22_ID,'d3-unseen-22-v1-20261114');
 assert.equal(D3_HOLDOUT_22.length,22);
 const seeds=D3_HOLDOUT_22.map(x=>x.seed);
 assert.equal(new Set(seeds).size,22);
 const historical=new Set(Array.from({length:44},(_,i)=>31045+i*13));
 for(const seed of seeds){
  assert.ok(Number.isSafeInteger(seed)&&seed>500000);
  assert.ok(!historical.has(seed));
  assert.ok(![31123,31162,31175].includes(seed));
 }
});
test('one small and one standard new map per 11 archetypes',()=>{
 const types=new Map();
 for(const x of D3_HOLDOUT_22){
  const scales=types.get(x.archetype)??[];
  scales.push(x.scale);types.set(x.archetype,scales);
 }
 assert.equal(types.size,11);
 for(const [name,scales] of types){
  assert.deepEqual(scales,['small','standard'],name);
 }
});
test('holdout flag uses same production Session, tick and authored order harness',()=>{
 const source=readFileSync(new URL('../scripts/audit-r7-squad-execution.mjs',import.meta.url),'utf8');
 assert.match(source,/const holdout22=process\.argv\.includes\('--holdout-22'\)/);
 assert.match(source,/const cohort=holdout22\?D3_HOLDOUT_22\[i\]:null/);
 assert.match(source,/const seed=cohort\?\.seed\?\?31045\+i\*13/);
 assert.match(source,/\['authored','entry'\]\.map\(mode=>run\(site,seed,mode\)\)/);
 assert.match(source,/stepSession\(session,1\/60\)/);
});
