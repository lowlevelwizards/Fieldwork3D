import test from 'node:test';
import assert from 'node:assert/strict';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {lockpickContactCandidate} from '../src/breach-lockpick-contact.ts';
import {advanceContextualSupportContacts} from '../src/breach-contextual-support-contact.ts';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {physicalContactWeight} from '../src/breach-physical-contact-anchor.ts';

function fixture(){
 const s=createA3Session({...DEFAULT_A3_CONFIG,
   scenario:'doorway',operators:1,intent:'hold'});
 const a=team(s)[0],door=s.doors[0];
 s.seconds=2;
 a.p={x:256,y:241};a.heading=0;a.velocity=0;
 a.plan=[{id:410,kind:'tool',doorId:door.id,
   toolMethod:'pick',p:{...a.p}}];
 a.actionTimer=.6;
 return {s,a,door};
}
test('A3.8-L existing door actual keyway can be reached without wall crossing',()=>{
 const {s,a,door}=fixture();
 try{
  const c=lockpickContactCandidate(s,a,door);
  assert.ok(c,'valid close handle-side contact');
  assert.equal(c.intent,'tool');
  assert.equal(c.limb,'support-hand');
  assert.equal(c.anchor.target,'door');
  assert.equal(c.anchor.id,door.id+':keyway');
  assert.equal(c.anchor.point.y,19);
  assert.ok(c.anchor.normal.x<0,'outward normal faces actor side');
  a.p={x:180,y:241};
  assert.equal(lockpickContactCandidate(s,a,door),null,
   'a remote tool cannot move hand across room');
 }finally{activateSite(null);}
});
test('A3.8-L action owns one hand and preserves immutable acquisition clock',()=>{
 const {s,a}=fixture();
 try{
  advanceContextualSupportContacts(s);
  const first=a.physicalContact;
  assert.equal(first?.intent,'tool');
  s.seconds+=.25;
  advanceContextualSupportContacts(s);
  assert.equal(a.physicalContact?.startedAt,first.startedAt);
  const state=resolveOperatorActionState({
   seconds:s.seconds,lastThrowAt:-100,lastDoorAt:s.seconds-.4,
   doorMethod:'open',doorGrip:null,physicalContact:a.physicalContact,
   doorPoint:{x:270,y:242},lockpickActive:true,
   reload:0,reloadDuration:1,weapon:'carbine',
   treatmentActive:false,down:false,surrender:false,injury:0,
   aiming:false,firing:false
  },0,false);
  assert.equal(state.handOwners.action,'door');
  assert.equal(state.handOwners.left,'door');
  assert.equal(state.physicalContact?.contact.intent,'tool');
  a.reload=1;s.seconds+=1/60;
  advanceContextualSupportContacts(s);
  assert.notEqual(a.physicalContact?.releasedAt,null,
   'reloading must interrupt tool hand');
 }finally{activateSite(null);}
});
test('A3.8-L finished order releases a real keyway and replay retains history',()=>{
 const {s,a}=fixture();
 try{
  advanceContextualSupportContacts(s);
  const film=snapshot(s);
  assert.equal(film.actors.find(x=>x.id===a.id)?.physicalContact?.intent,
   'tool');
  a.plan=[];a.actionTimer=0;s.seconds+=.02;
  advanceContextualSupportContacts(s);
  assert.ok(a.physicalContact?.releasedAt!==null);
  assert.ok(physicalContactWeight(a.physicalContact,s.seconds)>.01);
  applyReplayFrame(s,film);
  assert.equal(a.physicalContact?.releasedAt,null,
   'seek restores immutable historical contact');
  assert.equal(a.physicalContact?.intent,'tool');
 }finally{activateSite(null);}
});
