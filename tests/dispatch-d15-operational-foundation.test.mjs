import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCombatant,captureTargetResolved}
 from '../src/breach-suspect-operational-state.ts';
import {classifySuspectCustody}
 from '../src/dispatch-custody-classification.ts';
import {newSession,team,enemies,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {commitSuspectSurrender}
 from '../src/breach-suspect-compliance.ts';

test('D15.1 living submission is physically alive but lacks combat authority',()=>{
 const compliant={side:'red',health:3,injuryStage:0,surrendered:true};
 assert.equal(activeCombatant(compliant),false);
 assert.equal(captureTargetResolved(compliant),true);
 assert.equal(classifySuspectCustody(compliant).disposition,'living-compliant');
 assert.equal(classifySuspectCustody(compliant).custodyCandidate,true);
 assert.equal(activeCombatant({...compliant,surrendered:false}),true);
 assert.equal(captureTargetResolved({...compliant,surrendered:false}),false);
 assert.equal(activeCombatant({...compliant,health:NaN}),false);
 assert.equal(captureTargetResolved({...compliant,health:NaN}),false);
 assert.equal(captureTargetResolved({...compliant,side:'blue'}),false);
});

test('D15.1 legacy surrender is NOT physical custody or a living captive',()=>{
 const s=newSession(0,4);
 try{
  const suspect=enemies(s)[0],officer=team(s)[0];
  assert.ok(suspect&&officer);
  // D9 historical frames had zero health; classify rather than reinterpret them.
  suspect.health=0;suspect.injuryStage=3;suspect.surrendered=true;
  assert.equal(classifySuspectCustody(suspect).disposition,'legacy-surrendered-down');
  assert.equal(classifySuspectCustody(suspect).custodyCandidate,false);
  assert.equal(classifySuspectCustody(officer).disposition,'not-suspect');
  assert.equal(s.captureSecured,false);
 }finally{activateSite(null);}
});

test('D15.1 living submission satisfies neutralization not physical custody',()=>{
 const s=newSession(0,4);
 try{
  const target=enemies(s).find(x=>x.id===s.captureTarget);
  assert.ok(target);
  for(const x of enemies(s))if(x!==target)x.health=0;
  target.health=3;target.injuryStage=0;target.surrendered=true;
  toggling(s);stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.equal(s.captureSecured,false);
  assert.equal(target.health,3);
 }finally{activateSite(null);}
});

test('D15 capture proximity is not a substitute for living restraint',()=>{
 const s=newSession(0,4);
 try{
  const a=team(s)[0],target=enemies(s).find(x=>x.id===s.captureTarget);
  assert.ok(target);
  for(const e of enemies(s))if(e!==target)e.health=0;
  target.health=3;target.injuryStage=0;target.surrendered=true;
  target.p={...a.p};target.priorP={...a.p};
  toggling(s);stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.equal(s.captureSecured,false,
   'unrestrained living suspect is not captured by proximity');
  target.restrained=true;stepSession(s,1/60);
  assert.equal(s.captureSecured,true,
   'completed physical custody permits objective secure phase');
 }finally{activateSite(null);}
});
