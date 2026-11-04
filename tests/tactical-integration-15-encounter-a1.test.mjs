import test from 'node:test';
import assert from 'node:assert/strict';
import {perceptualReadiness,encounterReactionDelay,
 encounterReactionPhase} from '../src/breach-encounter-readiness.ts';
import {soundResponse,soundPriority,interpretSound}
 from '../src/breach-sound-evidence.ts';
import {encounterAuditSnapshot,summarizeEncounterAudit}
 from '../src/breach-encounter-audit.ts';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {advanceSight,confirmedSight,visualGain} from '../src/breach-visual-perception.ts';

test('A0 encounter diagnostic samples actual enemy awareness without mutating actors',()=>{
 const s=newSession(),r=enemies(s)[0],b=team(s)[0];
 r.awareness.visualProgress[b.id]=.7;
 const before=structuredClone(r.awareness);
 const rows=encounterAuditSnapshot(2,s.operators);
 assert.equal(rows.length,enemies(s).filter(e=>e.health>0).length);
 assert.equal(rows.find(x=>x.id===r.id)?.visualProgress,.7);
 assert.deepEqual(r.awareness,before);
 const metrics=summarizeEncounterAudit(rows);
 assert.equal(metrics.samples,rows.length);
 assert.equal(metrics.firstVisualAt,null);
});
test('A1 readiness changes only acquisition tempo, never physical geometry',()=>{
 assert.ok(perceptualReadiness('prepared')>perceptualReadiness('relaxed'));
 const base=visualGain(90,.24,false,false);
 assert.ok(base>0);
 const prepared=base*perceptualReadiness('prepared');
 const relaxed=base*perceptualReadiness('relaxed');
 let p=0,q=0;
 for(let i=0;i<18;i++){
  p=advanceSight(p,1/60,prepared,true);
  q=advanceSight(q,1/60,relaxed,true);
 }
 assert.ok(p>q);
 assert.equal(advanceSight(p,1/60,prepared,false),0);
 assert.equal(confirmedSight(0),false);
});
test('A2 reaction phases orient first, then ready, then act without resetting',()=>{
 for(const readiness of ['unaware','relaxed','attentive','prepared']){
  const delay=encounterReactionDelay(readiness,'guard4');
  assert.equal(encounterReactionPhase(10,10,10+delay),'orient');
  assert.equal(encounterReactionPhase(10+delay*.7,10,10+delay),'ready');
  assert.equal(encounterReactionPhase(10+delay,10,10+delay),'act');
 }
 assert.ok(encounterReactionDelay('relaxed','guard4')>
           encounterReactionDelay('prepared','guard4'));
 assert.equal(encounterReactionPhase(10,undefined,Infinity),'act');
});
test('A3 weak footstep can turn a head; violent evidence demands investigation',()=>{
 assert.equal(soundResponse('footstep',.05),'ignore');
 assert.equal(soundResponse('footstep',.30),'orient');
 assert.equal(soundResponse('footstep',.75),'investigate');
 assert.equal(soundResponse('door',.12),'orient');
 assert.equal(soundResponse('glass',.12),'alarm');
 assert.equal(soundResponse('gunshot',.5),'alarm');
 assert.ok(soundPriority('alarm')>soundPriority('orient'));
 const e={id:24,p:{x:30,y:30},radius:270,time:4,kind:'gunshot'};
 const a=interpretSound(e,'guard1',{x:130,y:110},[],[]);
 assert.ok(a&&a.uncertainty>0);
 assert.notDeepEqual(a.estimate,e.p,'sound location remains uncertain');
});
