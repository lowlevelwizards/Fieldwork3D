/** D2.5: simulated detection/ID/reaction/range, never render-frame intel. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {visualGain,advanceSight,identificationRate,
 detectedSight,confirmedSight,SIGHT_DETECTION_THRESHOLD}
 from '../src/breach-visual-perception.ts';
import {encounterReactionDelay,confirmedRangeReactionCost}
 from '../src/breach-encounter-readiness.ts';
import {advanceActorSightProgress}
 from '../src/breach-visual-acquisition.ts';
import {scanEnemyVisualEvidence}
 from '../src/breach-ai-visual-evidence.ts';
import {acquisitionSeconds} from '../src/breach-firing-cadence.ts';
import {shotDispersionCone} from '../src/breach-shot-ignition.ts';
import {newSession,team,enemies,inSight,geometricallyVisible}
 from '../src/breach-game.ts';
import {stage1ContactSite}
 from './fixtures/breach-stage1-contract-runner.mjs';

const progressUntil=(range,rate,threshold,offAxis=0)=>{
 let progress=0;
 const signal=visualGain(range,offAxis,false,false);
 for(let i=0;i<600;i++){
  progress=advanceSight(progress,1/60,signal,true,rate);
  if(progress>=threshold)return i+1;
 }
 return Infinity;
};

test('D2.5.1 silhouette timing is unchanged; only distant positive ID is slower',()=>{
 assert.equal(identificationRate(0),1);
 assert.equal(identificationRate(240),1);
 assert.ok(identificationRate(800)<1&&identificationRate(1600)<identificationRate(800));
 assert.ok(identificationRate(5000)>=.58);
 for(const range of [100,240,600,900,1400]){
  const rate=identificationRate(range);
  assert.equal(progressUntil(range,rate,SIGHT_DETECTION_THRESHOLD),
    progressUntil(range,1,SIGHT_DETECTION_THRESHOLD),
    'detection should have identical first visible tick at range '+range);
  const id=progressUntil(range,rate,.999);
  const old=progressUntil(range,1,.999);
  assert.ok(id>=old,'never accelerates long-range ID');
  if(range<=240)assert.equal(id,old,'CQB baseline unchanged');
  else assert.ok(id>old,'post-glimpse range penalty applied');
 }
});
test('D2.5.1 threshold crossing splits one fixed-step increment exactly',()=>{
 const delta=.15,rate=.65;
 const crossed=advanceSight(.10,1/60,6,true,rate);
 const original=.10+6*5.8/60;
 assert.ok(original>SIGHT_DETECTION_THRESHOLD);
 assert.ok(Math.abs(crossed-(SIGHT_DETECTION_THRESHOLD+
   (original-SIGHT_DETECTION_THRESHOLD)*rate))<1e-12);
 assert.equal(advanceSight(.2,1/60,6,true,1),.2+6*5.8/60);
 assert.equal(advanceSight(.8,1/60,6,false,.58),0);
 assert.equal(advanceSight(.8,1/60,0,true,.58),0);
 assert.equal(confirmedSight(advanceSight(.998,1/60,5,true,.58)),true);
});
test('D2.5.2 reaction cost applies ONLY after confirmed sight and stays bounded',()=>{
 assert.equal(confirmedRangeReactionCost(200),0);
 assert.equal(confirmedRangeReactionCost(240),0);
 assert.ok(confirmedRangeReactionCost(1200)>confirmedRangeReactionCost(450));
 assert.ok(confirmedRangeReactionCost(8000)<=.30);
 for(const readiness of ['unaware','relaxed','attentive','suspicious','alerted','prepared']){
  const near=encounterReactionDelay(readiness,'guard7');
  const far=encounterReactionDelay(readiness,'guard7',1400);
  assert.ok(far>near&&far-near<=.301);
  assert.equal(near,encounterReactionDelay(readiness,'guard7',240));
 }
 assert.ok(encounterReactionDelay('unaware','guard7',1400)>
   encounterReactionDelay('prepared','guard7',1400));
});
test('D2.5.3 AI runs one opposing-team visibility scan, retains first-confirmed order',()=>{
 const s=newSession(0,undefined,'true-blind','small','hold',stage1ContactSite());
 const guard=enemies(s)[0],blue=team(s);
 s.seconds=3;
 guard.encounterReactionUntil=Number.POSITIVE_INFINITY;
 for(const b of blue)guard.awareness.visualProgress[b.id]=.3;
 let checked=0;
 const first=scanEnemyVisualEvidence(s,guard,1/60,(_a,b)=>{
  checked++;return b===blue.at(-1);
 });
 assert.equal(checked,blue.length,'single LOS pass for all opposite-side actors');
 assert.deepEqual(first,[blue.at(-1)]);
 assert.equal(guard.lastVisualSuspicionId,blue.at(-1).id);
 assert.ok(Number.isFinite(guard.encounterReactionUntil));
 const expected=encounterReactionDelay(guard.encounterReadiness??'attentive',
  guard.id,Math.hypot(blue.at(-1).p.x-guard.p.x,blue.at(-1).p.y-guard.p.y));
 assert.ok(Math.abs(guard.encounterReactionUntil-s.seconds-expected)<1e-9);
});
test('D2.5.3 unidentified glimpse cannot open fire or start guard reaction',()=>{
 const s=newSession(0,undefined,'true-blind','small','hold',stage1ContactSite());
 const guard=enemies(s)[0],friendly=team(s)[0];
 s.seconds=2;
 guard.encounterReactionUntil=Number.POSITIVE_INFINITY;
 guard.awareness.visualProgress[friendly.id]=.25;
 let probed=0;
 const visible=scanEnemyVisualEvidence(s,guard,1/60,()=>{
  probed++;return false;
 });
 assert.deepEqual(visible,[]);
 assert.equal(probed,team(s).length);
 assert.equal(guard.lastVisualSuspicionId,'silhouette/'+friendly.id);
 assert.equal(guard.encounterReactionUntil,Number.POSITIVE_INFINITY);
 assert.equal(guard.targetId,null);
 assert.equal(s.reports.length,0);
});
test('D2.5.1 the real fixed-step progression needs one LOS sample per pair',()=>{
 const s=newSession(0,undefined,'true-blind','small','hold',stage1ContactSite());
 s.seconds=2;
 const blue=team(s)[0],guard=enemies(s)[0];
 blue.heading=0;guard.heading=Math.PI;
 let checks=0;
 advanceActorSightProgress(s,1/60,()=>{checks++;return true;});
 assert.equal(checks,team(s).length*enemies(s).length*2,
  'one sample for each live cross-team ordered pair');
 assert.ok(blue.awareness.visualProgress[guard.id]>0);
 advanceActorSightProgress(s,1/60,()=>{checks++;return false;});
 assert.equal(blue.awareness.visualProgress[guard.id],0);
 assert.equal(guard.awareness.visualProgress[blue.id],0);
});
test('D2.5.4 existing independent shot-time range and aim penalties remain physical',()=>{
 const base={base:.3,moving:false,skillFactor:1,enemy:false,
  attachmentFactor:1,cautious:false};
 assert.ok(acquisitionSeconds({...base,range:1300})>
  acquisitionSeconds({...base,range:120}));
 const shooter={weapon:'rifle',stability:1,suppression:0,
  injuryStage:0,recoil:0,turning:0,velocity:0,
  skills:{longRange:50,precision:50,pointShooting:50}};
 const mods={turn:1,acquisition:1,recovery:1,recoilKick:1,
  noise:1,optic:'irons',stable:1};
 assert.ok(shotDispersionCone(shooter,'ads',1400,false,mods,200)>
  shotDispersionCone(shooter,'ads',120,false,mods,200));
});
