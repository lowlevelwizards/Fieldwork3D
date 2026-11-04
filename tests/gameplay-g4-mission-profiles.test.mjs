import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEncounterProfile} from '../src/worldgen/encounter-profiles.ts';
const sample=(premise,mission)=>Array.from({length:160},(_,seed)=>
 chooseEncounterProfile(premise,seed,mission));
const count=(xs,value)=>xs.filter(x=>x===value).length;
test('G4c: mission-aware profile sampling stays seed reproducible',()=>{
 for(const mission of ['clear','intel','rescue','capture','hold']){
  assert.deepEqual(sample('routine',mission),sample('routine',mission));
  assert.ok(sample('routine',mission).every(p=>
   ['quiet-approach','scattered','clustered','active','prepared'].includes(p)));
 }
 assert.equal(chooseEncounterProfile('routine',17),
   chooseEncounterProfile('routine',17));
});
test('G4c: hold concentrates prepared encounters; intel rewards quiet entries',()=>{
 const hold=sample('routine','hold'),clear=sample('routine','clear'),
  intel=sample('routine','intel');
 assert.ok(count(hold,'prepared')>count(clear,'prepared')*1.4);
 assert.ok(count(intel,'quiet-approach')>count(clear,'quiet-approach')*1.4);
});
test('G4c: rescue and capture can cluster, without forcing same profile',()=>{
 const rescue=sample('routine','rescue'),capture=sample('routine','capture'),
  clear=sample('routine','clear');
 assert.ok(count(rescue,'clustered')>count(clear,'clustered'));
 assert.ok(count(capture,'clustered')>count(clear,'clustered'));
 for(const xs of [rescue,capture]){
  assert.ok(new Set(xs).size>=3,'mission still offers tactical variety');
 }
});
