import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseAiIntent} from '../src/breach-ai-policy.ts';
import {chooseCombatAction} from '../src/breach-ai-combat.ts';
import {settledEnemyPosture} from '../src/breach-ai-posture.ts';
import {chooseEncounterProfile} from '../src/worldgen/encounter-profiles.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditEncounter} from '../src/worldgen/encounter-diagnostics.ts';
import {clearOfInsertion} from '../src/worldgen/encounter-spawn-safety.ts';
import {activateSite,passable} from '../src/breach-core.ts';

test('A4 enemy temperament changes resolve thresholds, not observation rules',()=>{
 const state={visible:true,hasBelief:false,recentSound:false,
  suppression:.62,morale:.57};
 assert.equal(chooseAiIntent(null,{...state,temperament:'cautious'},3).kind,'withdraw');
 assert.equal(chooseAiIntent(null,{...state,temperament:'aggressor'},3).kind,'engage');
 assert.equal(chooseCombatAction({visible:false,remembered:true,
  laneClear:true,ammunition:10,suppression:0,morale:1,
  temperament:'aggressor'}),'investigate');
 const unseen={...state,visible:false,hasBelief:false,recentSound:false};
 assert.notEqual(chooseAiIntent(null,{...unseen,temperament:'guard'},3).kind,'engage');
});
test('A5 enemy stand/crouch cannot flicker but legal muzzle can instantly stand',()=>{
 assert.equal(settledEnemyPosture('crouch','stand',3,2.8),'crouch');
 assert.equal(settledEnemyPosture('crouch','stand',3,2.8,true),'stand');
 assert.equal(settledEnemyPosture('crouch','stand',3.4,2.8),'stand');
 assert.equal(settledEnemyPosture('stand','crouch',3,2.8),'stand');
 assert.equal(settledEnemyPosture('stand','crouch',3.4,2.8),'crouch');
});
test('A6 encounter profile is deterministic and creates meaningful varied seeds',()=>{
 const results=new Set();
 for(let seed=1;seed<=60;seed++){
  const chosen=chooseEncounterProfile('routine',seed);
  results.add(chosen);
  assert.equal(chosen,chooseEncounterProfile('routine',seed));
 }
 assert.ok(results.size>=3,'seeded profile choices should not all look identical');
 assert.ok(['quiet-approach','scattered','clustered','active','prepared']
  .includes(chooseEncounterProfile('defensive',41)));
});
test('A6/A7 generated scenario keeps safe insertion and valid physical placement',()=>{
 try{
  for(const seed of [32,53]){
   const site=generateSite(seed,'small',undefined,{mission:'clear',risk:2});
   const copy=generateSite(seed,'small',undefined,{mission:'clear',risk:2});
   assert.deepEqual(site.enemies,copy.enemies);
   assert.equal(site.encounter.profile,copy.encounter.profile);
   const audit=auditEncounter(site);
   assert.equal(audit.profile,site.encounter.profile);
   assert.equal(audit.hostiles,site.enemies.length);
   assert.ok(audit.nearInsertionCount<=audit.hostiles);
   activateSite(site);
   for(const p of site.enemies){
    assert.equal(clearOfInsertion(site,p),true);
    assert.equal(passable(p),true);
   }
  }
 }finally{activateSite(null);}
});
