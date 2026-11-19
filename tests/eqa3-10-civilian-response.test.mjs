import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianResponse} from '../src/breach-civilian-response.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

const person=()=>createCivilian({id:'civ:eqa3-10:flinch',
 role:'visitor',persona:'steady',activity:'idle',
 position:{x:30,y:40},heading:0,roomId:'a',appearanceSeed:5});
const sensory=(noise=[])=>({
 noise,people:[],doors:[],walls:[],windows:[],canSee:()=>true,
 canReach:()=>true,routeTo:()=>[]
});
test('EQA3.10 only actual alarm evidence triggers a visual flinch',()=>{
 const c=person();
 stepCivilianResponse(c,.2,.2,sensory());
 assert.equal(c.lastFlinchAt,-100,'calm civilian should not react to imaginary danger');
 // Exercise the actual low-frequency observer and acoustic admission rather
 // than setting visual state directly.
 stepCivilianResponse(c,.5,.3,sensory([{
   id:1,time:.45,kind:'gunshot',p:{x:32,y:42},radius:200
 }]));
 assert.equal(c.lastFlinchAt,.45,'witnessed gunshot alarm should drive flinch at evidence time');
});
test('EQA3.10 legacy and shared civilian rigs flinch briefly and rewind without residue',()=>{
 const c=person(),rig=createCivilianRig(c),unified=createCivilianRig(c,true);
 try{
  updateCivilianRig(rig,c,1);const calmHead=rig.head.rotation.y;
  c.lastEvidenceAt=1.1;c.threatEstimate={x:30,y:90};
  updateCivilianRig(rig,c,1.3);
  assert.ok(rig.head.rotation.y>calmHead+.08,
    'idle work must not override heard/observed head direction');
  c.lastFlinchAt=1.4;
  updateCivilianRig(rig,c,1.55);
  assert.ok(rig.upper.position.y<0,'flinch hunches rather than teleporting');
  assert.ok(rig.leftArm.rotation.z< -1.5,'flinch shields head');
  updateCivilianRig(unified,c,1.55);
  assert.ok(Number.isFinite(unified.character.head.rotation.y));
  c.threatEstimate=null;
  updateCivilianRig(rig,c,2.4);
  assert.equal(rig.upper.position.y,0,'flinch expires cleanly');
  updateCivilianRig(rig,c,1.55);
  assert.ok(rig.upper.position.y<0,'rewind reproduces the same flinch');
 }finally{disposeCivilianRig(unified);}
});
test('EQA3.10 replay preserves flinch while older film does not inherit future poses',()=>{
 const s=newSession(),c=person();s.civilians.push(c);
 s.seconds=2;c.lastFlinchAt=1.95;
 const observed=snapshot(s);
 s.seconds=3;c.lastFlinchAt=2.97;
 applyReplayFrame(s,observed);
 assert.equal(s.civilians[0].lastFlinchAt,1.95);
 const old=snapshot(s);
 delete old.civilians[0].lastFlinchAt;
 applyReplayFrame(s,old);
 assert.equal(s.civilians[0].lastFlinchAt,-100);
});
