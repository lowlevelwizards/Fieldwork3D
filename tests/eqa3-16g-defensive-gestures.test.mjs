import test from 'node:test';
import assert from 'node:assert/strict';
import {hostilePhysicalityAt}
 from '../src/breach-hostile-physicality.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const p=(x,y)=>({x,y});
const sample=()=>({
 side:'red',p:p(100,100),heading:0,health:2,
 surrendered:false,alert:'cover',aim:0,velocity:0,
 reload:0,suppression:.9,lastNoiseAt:-100,heard:null,contact:p(400,100)
});
test('EQA3.16G actual suppression visually guards head, never reveals unseen direction',()=>{
 const a=sample(),before=JSON.stringify(a);
 const pose=hostilePhysicalityAt(a,5);
 assert.equal(pose.headYaw,0,'suppression is not a target vector');
 assert.ok(pose.guarding&&pose.headPitch>.07&&pose.headPitch<=.115);
 assert.equal(JSON.stringify(a),before,'no simulation or enemy order mutation');
 a.aim=.65;
 assert.equal(hostilePhysicalityAt(a,5).headPitch,0,
  'aiming and firearm IK retain priority');
 a.aim=0;a.alert='engaging';
 assert.equal(hostilePhysicalityAt(a,5).headPitch,0);
 a.alert='cover';a.suppression=.1;
 assert.equal(hostilePhysicalityAt(a,5).headPitch,0);
 a.suppression=.9;a.side='blue';
 assert.equal(hostilePhysicalityAt(a,5).headPitch,0,
  'no player-authored operator pose changes');
 a.side='red';a.health=0;
 assert.equal(hostilePhysicalityAt(a,5).headPitch,0);
});
test('EQA3.16G withdrawal gaze derives only from recent personally heard estimate',()=>{
 const a=sample();a.alert='retreat';a.velocity=25;
 a.heard=p(100,200);a.lastNoiseAt=2;
 const posed=hostilePhysicalityAt(a,2.4);
 assert.ok(posed.headYaw>.015&&posed.headYaw<=.12,
  'retreating hostile may look toward the last actually heard disturbance');
 assert.ok(posed.headPitch>0,'head guard coexists with legitimate running gait');
 assert.equal(hostilePhysicalityAt(a,10).headYaw,0);
 a.heard=null;
 assert.equal(hostilePhysicalityAt(a,2.4).headYaw,0,
  'a retained combat contact is not a substitute for evidence');
 a.heard=p(100,200);a.reload=1;
 assert.equal(hostilePhysicalityAt(a,2.4).headYaw,0);
});
test('EQA3.16G replay samples defensive presentation without later evidence leakage',()=>{
 const s=newSession(),a=enemies(s)[0];
 assert.ok(a);
 a.alert='cover';a.suppression=.8;
 a.heading=0;a.p=p(100,100);
 a.heard=p(100,180);a.lastNoiseAt=2;
 s.seconds=2.4;const before=snapshot(s);
 a.alert='retreat';a.suppression=.95;
 a.heard=p(100,20);a.lastNoiseAt=5;
 s.seconds=5.5;const after=snapshot(s);
 applyReplayFrame(s,before);
 const prior=hostilePhysicalityAt(a,s.seconds);
 assert.ok(prior.headYaw>.01&&prior.headPitch>0);
 applyReplayFrame(s,after);
 assert.ok(hostilePhysicalityAt(a,s.seconds).headYaw<-.01);
 applyReplayFrame(s,before);
 assert.deepEqual(hostilePhysicalityAt(a,s.seconds),prior);
});
