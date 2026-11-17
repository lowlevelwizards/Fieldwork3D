import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySuspectCustody} from '../src/dispatch-custody-classification.ts';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {activateSite} from '../src/breach-core.ts';

const suspect={side:'red',health:3,injuryStage:0,surrendered:false};
test('D15.1 active hostiles and living submission are distinct from confirmed custody',()=>{
 assert.deepEqual(classifySuspectCustody(suspect),
  {disposition:'active-threat',custodyCandidate:false});
 assert.deepEqual(classifySuspectCustody({...suspect,surrendered:true}),
  {disposition:'living-compliant',custodyCandidate:true});
 assert.equal(Object.isFrozen(classifySuspectCustody(suspect)),true);
});

test('D15.1 D9 surrender never masquerades as a conscious handcuffable person',()=>{
 const s=newSession(15001,4);
 try{
  const enemy=enemies(s)[0],friendly=team(s)[0];
  assert.ok(enemy&&friendly);
  assert.equal(commitSuspectSurrender(s,enemy,()=>{},()=>{}),true);
  assert.equal(enemy.health,0);
  assert.equal(enemy.injuryStage,3);
  assert.deepEqual(classifySuspectCustody(enemy),
   {disposition:'legacy-surrendered-down',custodyCandidate:false});
  assert.equal(classifySuspectCustody(friendly).disposition,'not-suspect');
  assert.equal(s.captureSecured,false,'verbal surrender did not secure custody');
 }finally{activateSite(null);}
});

test('D15.1 incapacitated, malformed or falsely labeled targets cannot be restrained',()=>{
 const variants=[
  [{...suspect,health:0},'incapacitated'],
  [{...suspect,injuryStage:3},'incapacitated'],
  [{...suspect,health:0,surrendered:true},'legacy-surrendered-down'],
  [{...suspect,health:NaN},'invalid-state'],
  [{...suspect,health:Infinity},'invalid-state'],
  [{...suspect,injuryStage:-1},'invalid-state'],
  [{...suspect,injuryStage:4},'invalid-state'],
  [{...suspect,injuryStage:1.5},'invalid-state'],
  [{...suspect,surrendered:'yes'},'invalid-state'],
  [{...suspect,side:'blue',surrendered:true},'not-suspect'],
 ];
 for(const [target,expected] of variants){
  const result=classifySuspectCustody(target);
  assert.equal(result.disposition,expected);
  assert.equal(result.custodyCandidate,false);
 }
});
