import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {registerWound,stabilizeWound} from '../src/breach-medical-wounds.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {retainImpactMark} from '../src/breach-impact-evidence-buffer.ts';
import {sampleBleedingEvidence,bloodMarkRadius,ageImpactEvidence} from '../src/breach-blood-evidence.ts';
import {sampleBloodBurst,BLOOD_BURST_COUNT} from '../src/rendering/breach-blood-burst.ts';
import {BLOOD_MARK_LIMIT,IMPACT_MARK_LIMIT} from '../src/breach-effects.ts';
const blood=(id,x=0,kind='splat',owner)=>({id,p:{x,y:0},surface:'blood',age:0,bloodKind:kind,bloodOwnerId:owner,bloodAmount:1});
test('blood persists, settles, accumulates, stays bounded and is not displaced by ordinary impacts',()=>{
 const s={impactMarks:[]};
 retainImpactMark(s,blood(1));const initial=bloodMarkRadius(s.impactMarks[0]);
 retainImpactMark(s,blood(2,3));assert.equal(s.impactMarks.length,1);assert.ok(bloodMarkRadius(s.impactMarks[0])>initial);
 retainImpactMark(s,blood(3,0,'pool','a'));assert.equal(s.impactMarks.length,2);
 ageImpactEvidence(s.impactMarks,100);assert.equal(s.impactMarks.length,2);assert.equal(s.impactMarks[0].age,3);
 for(let i=0;i<200;i++)retainImpactMark(s,{id:i+100,surface:'stone',p:{x:i,y:5},age:0});
 assert.equal(s.impactMarks.length,IMPACT_MARK_LIMIT);assert.equal(s.impactMarks.filter(m=>m.surface==='blood').length,2);
 for(let i=0;i<100;i++)retainImpactMark(s,blood(400+i,i*20,'pool','b'));
 assert.equal(s.impactMarks.filter(m=>m.surface==='blood').length,BLOOD_MARK_LIMIT);
 assert.ok(s.impactMarks.length<=IMPACT_MARK_LIMIT);
});
test('wound-driven pool grows, stays behind when moved, stops on treatment and survives replay',()=>{
 const s=newSession(),a=s.operators[0];a.p={x:30,y:30};s.operators=[a];
 registerWound(a.medical,7,'torso',2,0);
 const medical=JSON.stringify(a.medical),effectId=s.nextEffectId;
 for(let i=1;i<=8;i++){s.seconds=i*.5;sampleBleedingEvidence(s,1/60);}
 assert.equal(s.impactMarks.length,1);const first=s.impactMarks[0],amount=first.bloodAmount;
 assert.ok(amount>2);assert.ok(bloodMarkRadius(first)>10);assert.equal(first.id<0,true);
 assert.equal(JSON.stringify(a.medical),medical);assert.equal(s.nextEffectId,effectId);
 a.p={x:55,y:30};s.seconds=4.5;sampleBleedingEvidence(s,1/60);
 assert.equal(s.impactMarks.length,2);assert.equal(first.p.x,30);
 const old=snapshot(s);stabilizeWound(a.medical,7);
 s.seconds=5;sampleBleedingEvidence(s,1/60);assert.deepEqual(s.impactMarks,old.impactMarks);
 applyReplayFrame(s,old);assert.equal(s.impactMarks[0].bloodAmount,amount);
});
test('pool sampling has no duplicate same-tick emissions on non-boundary ticks and no false bleeding',()=>{
 const s=newSession(),a=s.operators[0];s.operators=[a];a.p={x:30,y:30};
 s.seconds=.5;sampleBleedingEvidence(s,1/60);assert.equal(s.impactMarks.length,0);
 registerWound(a.medical,8,'torso',2,0);a.deathAt=.5;
 s.seconds=1;sampleBleedingEvidence(s,1/60);assert.equal(s.impactMarks.length,0);
 a.deathAt=null;s.seconds=1.1;sampleBleedingEvidence(s,1/60);assert.equal(s.impactMarks.length,0);
});
test('four deterministic chunky burst shapes use recorded elevation and direction',()=>{
 for(let i=0;i<BLOOD_BURST_COUNT;i++){
  const a={},b={};assert.equal(sampleBloodBurst(3,i,.1,0,20,24,30,a),true);
  sampleBloodBurst(3,i,.1,0,20,24,30,b);assert.deepEqual(a,b);
  assert.ok(a.width>2.5&&a.length>4&&a.opacity>.8&&a.x>20&&a.y>20);
  assert.equal(sampleBloodBurst(3,i,.4,0,20,24,30,a),false);
 }
});

test('blood evidence cannot merge across a wall and settled marks do not change on idle ticks',()=>{
 const s={impactMarks:[]},walls=[{a:{x:0,y:-20},b:{x:0,y:20}}];
 retainImpactMark(s,blood(1,-2),walls);retainImpactMark(s,blood(2,2),walls);
 assert.equal(s.impactMarks.length,2);
 ageImpactEvidence(s.impactMarks,4);const prior=JSON.stringify(s.impactMarks);
 ageImpactEvidence(s.impactMarks,1/60);assert.equal(JSON.stringify(s.impactMarks),prior);
});
