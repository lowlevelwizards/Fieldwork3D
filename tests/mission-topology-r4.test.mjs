import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {describeSiteTopology,preferTopologyCandidate,
 shouldSampleTopologyAlternative} from '../src/worldgen/topology-diversity.ts';
import {measureSiteCompleteness} from '../src/worldgen/site-completeness.ts';

test('R4: bounded topology preference never chooses a worse physical contract',()=>{
 const base={signature:'a',roomCount:7,connections:7,
  branchRooms:2,deadEnds:1,circulationCycles:1,hallwayShare:.22,
  exteriorThresholds:2};
 const challenger={...base,signature:'b',branchRooms:4,circulationCycles:3};
 for(let seed=0;seed<21;seed++){
  assert.equal(preferTopologyCandidate(challenger,base,2,1,seed),false);
  assert.equal(preferTopologyCandidate(challenger,base,0,1,seed),true);
  assert.equal(preferTopologyCandidate(base,base,0,0,seed),false);
 }
});
test('R4: sampled alternate selection is sparse and stable',()=>{
 const picked=Array.from({length:70},(_,seed)=>
  shouldSampleTopologyAlternative(seed,'small')).filter(Boolean).length;
 assert.ok(picked>0&&picked<22);
 assert.equal(shouldSampleTopologyAlternative(44,'small'),
  shouldSampleTopologyAlternative(44,'small'));
 assert.equal(shouldSampleTopologyAlternative(44,'large'),false);
});
test('R4: regenerated sites retain the same physical topology and quality',()=>{
 for(const seed of [3,7,21]){
  const one=generateSite(seed,'small');
  const two=generateSite(seed,'small');
  assert.deepEqual(describeSiteTopology(one),describeSiteTopology(two));
  assert.equal(measureSiteCompleteness(one).score,
   measureSiteCompleteness(two).score);
 }
});
