import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
test('D15.2 surrender preserves life and has one real weapon transfer',()=>{
 const s=newSession(0,4);
 try{
  const actor=enemies(s)[0],health=actor.health,rounds=actor.magazine;
  assert.equal(commitSuspectSurrender(s,actor,()=>{},()=>{}),true);
  assert.equal(actor.health,health);
  assert.equal(actor.injuryStage,0);
  assert.equal(actor.surrendered,true);
  assert.equal(s.droppedFirearms.length,1);
  assert.equal(s.droppedFirearms[0].ownerId,actor.id);
  assert.equal(s.droppedFirearms[0].loadedRounds,rounds);
  assert.equal(actor.releasedWeaponId,s.droppedFirearms[0].id);
  assert.equal(commitSuspectSurrender(s,actor,()=>{},()=>{}),false);
  assert.equal(s.droppedFirearms.length,1);
 }finally{activateSite(null);}
});
