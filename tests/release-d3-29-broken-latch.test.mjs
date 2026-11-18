import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor,kickDoor,advanceDoor} from '../src/breach-door.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
import {retreatDoorClosureEligible} from '../src/breach-ai-door-response.ts';
import {fallenDoorHardwarePose} from '../src/rendering/breach-door-broken-hardware-pose.ts';
import {ReplayDoorKnowledgeHistory,ReplayDoorObservationRecorder}
 from '../src/breach-replay-door-knowledge.ts';
import {newSession,team} from '../src/breach-game.ts';

const make=(locked=true)=>initDoor({
 id:'BROKEN-LATCH',a:{x:0,y:0},b:{x:40,y:0},
 open:false,openedAt:-1,hinge:'a',swing:-1,locked
},0);
const from={x:20,y:-17};
const interact=(d,action)=>doorInteraction({
 target:d,action,actorId:'ash',actorPosition:from
});
test('D3.29I: repeated correct-side kicks sever a locked latch permanently',()=>{
 const d=make();
 assert.equal(kickDoor(d,from).opened,false);
 assert.equal(d.locked,true);
 assert.notEqual(d.latchBroken,true);
 assert.equal(kickDoor(d,from).opened,true);
 assert.equal(d.latchBroken,true);
 assert.equal(d.locked,false);
 assert.equal(d.open,true);
 assert.equal(d.forced,true);
 assert.ok(d.pushTarget>1);
});
test('D3.29I: wrong-side kick cannot sever the latch',()=>{
 const d=make();
 for(let i=0;i<3;i++)
  assert.equal(kickDoor(d,{x:20,y:17}).opened,false);
 assert.equal(d.latchBroken,undefined);
 assert.equal(d.locked,true);
});
test('D3.29I: damaged door refuses handle open, close, and brace but permits push',()=>{
 const d=make(false);
 assert.equal(kickDoor(d,from).opened,true);
 for(const action of ['open','close','hold'])
  assert.equal(interact(d,action).reason,'unsupported');
 assert.equal(interact(d,'push').allowed,true);
});
test('D3.29I: full hinge motor cannot relatch even after stale CLOSE mutation',()=>{
 const d=make(false);kickDoor(d,from);
 d.open=false;d.locked=true;d.pushTarget=0;
 advanceDoor(d,1/60);
 assert.equal(d.open,true);
 assert.equal(d.locked,false);
 assert.ok(d.pushTarget>=1);
});
test('D3.29I: AI never closes a permanently damaged hinge',()=>{
 const d=make(false);kickDoor(d,from);
 d.openFraction=1;
 assert.equal(retreatDoorClosureEligible(from,d,20,-10,false,null),false);
});

test('D3.29I: detached handle falls only after actual kick, then rests indefinitely',()=>{
 const d=make(false);kickDoor(d,from);
 d.hardwareDetachedAt=12;d.hardwareDetachedFraction=0;
 const before=fallenDoorHardwarePose(d,11.99,40);
 const early=fallenDoorHardwarePose(d,12,40);
 const middle=fallenDoorHardwarePose(d,12.3,40);
 const landed=fallenDoorHardwarePose(d,14,40);
 assert.equal(before.visible,false);
 assert.equal(early.visible,true);
 assert.ok(middle.y<early.y);
 assert.equal(landed.settled,true);
 assert.ok(landed.y>=0&&landed.y<=5);
 assert.deepEqual(landed,fallenDoorHardwarePose(d,50,40),
   'settled fragments never need a live physics tick');
 assert.deepEqual(middle,fallenDoorHardwarePose(d,12.3,40),
   'replay seeks reproduce the same intermediate hardware pose');
});
test('D3.29I: an observer sees latch failure only after a confirmed sighting',()=>{
 const s=newSession(),observer=team(s)[0],door=make(false);
 s.doors=[door];s.seconds=2;
 const recorder=new ReplayDoorObservationRecorder();
 recorder.capture(s,()=>true);
 kickDoor(door,from);
 door.hardwareDetachedAt=3;door.hardwareDetachedFraction=0;
 s.seconds=3.04;recorder.capture(s,()=>false);
 s.seconds=3.2;recorder.capture(s,()=>true);
 const history=new ReplayDoorKnowledgeHistory(recorder.observations);
 assert.equal(history.at(2.5,observer.id,door.id)?.latchBroken,false);
 assert.equal(history.at(3.1,observer.id,door.id)?.latchBroken,false,
   'damage in an unseen interval must not become operator knowledge');
 assert.equal(history.at(3.25,observer.id,door.id)?.latchBroken,true);
 assert.equal(history.at(3.25,observer.id,door.id)?.hardwareDetachedAt,3);
 assert.equal(history.at(1,observer.id,door.id),null);
});
