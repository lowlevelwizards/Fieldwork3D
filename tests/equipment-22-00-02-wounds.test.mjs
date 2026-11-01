import test from 'node:test';import assert from 'node:assert/strict';
import {newMedicalCondition,registerWound,advanceMedicalCondition,
 stabilizeWound,mostUrgentWound} from '../src/breach-medical-wounds.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('22.01 armored hits cannot bleed and wound records are bounded',()=>{
 const c=newMedicalCondition();registerWound(c,10,'torso',0,1);
 assert.equal(c.wounds.length,0);
 for(let i=0;i<8;i++)registerWound(c,i+20,'torso',2,i);
 registerWound(c,20,'torso',2,100);assert.equal(c.wounds.length,4);
});
test('22.02 fixed bleeding progression and real stabilization',()=>{
 const c=newMedicalCondition();registerWound(c,10,'torso',2,0);
 assert.ok(mostUrgentWound(c));
 for(let i=0;i<4000;i++)advanceMedicalCondition(c,1/30);
 assert.ok(c.bloodLoss>=1);
 assert.equal(stabilizeWound(c,10),true);
 const saved=c.bloodLoss;
 for(let i=0;i<500;i++)advanceMedicalCondition(c,1/30);
 assert.equal(c.bloodLoss,saved);
 assert.equal(stabilizeWound(c,10),false);
});
test('22.02 replay snapshots cannot alias live wounds',()=>{
 const s=newSession(),a=s.operators.find(a=>a.id==='rook');
 registerWound(a.medical,10,'torso',2,1);
 const f=snapshot(s);a.medical.wounds[0].stabilized=true;
 assert.equal(f.actors.find(a=>a.id==='rook').medical.wounds[0].stabilized,false);
 applyReplayFrame(s,f);
 assert.equal(s.operators.find(a=>a.id==='rook').medical.wounds[0].stabilized,false);
});
