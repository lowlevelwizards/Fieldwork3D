/** Real-session A3.6–A3.7 bracing and teammate attachment regression gate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team,stepSession} from '../src/breach-game.ts';
import {
 advanceContextualSupportContacts,chooseEnvironmentSupport,
 chooseTeammateSupport,teammateShoulderPoint,wallSupportSurface,
 coverSupportSurface,SUPPORT_RELEASE_WINDOW
} from '../src/breach-contextual-support-contact.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {resolveOperatorActionState}
 from '../src/breach-pose-action-state.ts';
import {physicalContactWeight}
 from '../src/breach-physical-contact-anchor.ts';
const setup=(scenario,operators=4)=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,scenario,operators,
   intent:'hold'});
 s.seconds=2;
 return {s,a:team(s)[0],squad:team(s)};
};
const clean=()=>activateSite(null);
test('A3.6 geometrically real wall, cover, doorframe fixtures select surfaces',()=>{
 for(const [scenario,expected] of [
  ['brace-wall','wall:'],['brace-cover','cover:'],
  ['brace-frame','frame:']
 ]){
  const {s,a}=setup(scenario,1);
  try{
   const chosen=chooseEnvironmentSupport(s,a,
    sessionWorldGeometry(s),null);
   assert.ok(chosen,scenario+' has a physically valid surface');
   assert.ok(chosen.contact.anchor.id.startsWith(expected),
     scenario+': '+chosen.contact.anchor.id);
   assert.equal(chosen.contact.anchor.target,'surface');
   assert.equal(chosen.contact.intent,'brace');
   advanceContextualSupportContacts(s);
   assert.ok(a.physicalContact,scenario);
   assert.equal(a.physicalContact?.anchor.id,
    chosen.contact.anchor.id);
  }finally{clean();}
 }
});
test('A3.6 no phantoms: embedded cover, destroyed surface and invalid segment',()=>{
 assert.equal(wallSupportSurface({x:0,y:0},
  {a:{x:4,y:5},b:{x:4,y:5}},'degenerate'),null);
 const cover={x:50,y:40,w:30,h:30,topHeight:22};
 assert.equal(coverSupportSurface({x:50,y:40},cover,'inside'),null);
 assert.equal(coverSupportSurface({x:10,y:40},
  {...cover,destroyed:true},'broken'),null);
 assert.equal(coverSupportSurface({x:10,y:40},
  {...cover,topHeight:4},'short'),null);
});
test('A3.6 world occlusion veto prevents through-wall bracing',()=>{
 const {s,a}=setup('brace-wall',1);
 try{
  const world=sessionWorldGeometry(s);
  const occluded={...world,isClear:()=>false};
  assert.equal(chooseEnvironmentSupport(s,a,occluded,null),null);
  assert.equal(a.physicalContact,null);
 }finally{clean();}
});
test('A3.6 hold retains start, movement/active action releases and expires',()=>{
 const {s,a}=setup('brace-wall',1);
 try{
  advanceContextualSupportContacts(s);
  const original=a.physicalContact;
  assert.ok(original);
  s.seconds+=.3;
  advanceContextualSupportContacts(s);
  assert.equal(a.physicalContact?.startedAt,original.startedAt);
  assert.equal(a.physicalContact?.anchor.id,original.anchor.id);
  a.pace='run';s.seconds+=1/60;
  advanceContextualSupportContacts(s);
  const released=a.physicalContact;
  assert.ok(released?.releasedAt!==null);
  assert.ok(physicalContactWeight(released,s.seconds)>.01);
  s.seconds+=SUPPORT_RELEASE_WINDOW+.01;
  advanceContextualSupportContacts(s);
  assert.equal(a.physicalContact,null);
 }finally{clean();}
});
test('A3.7 four-operator aligned stack follows real leader rear shoulder',()=>{
 const {s,squad}=setup('stack-shoulder',4);
 try{
  advanceContextualSupportContacts(s);
  for(let i=0;i<3;i++){
   const c=squad[i].physicalContact;
   assert.equal(c?.intent,'teammate','follower '+i);
   assert.equal(c?.anchor.id,squad[i+1].id);
   assert.deepEqual(c?.anchor.point,teammateShoulderPoint(squad[i+1]));
  }
  assert.equal(squad[3].physicalContact,null);
  const original=squad[0].physicalContact;
  squad[1].p.x+=1;
  s.seconds+=1/60;
  advanceContextualSupportContacts(s);
  assert.equal(squad[0].physicalContact?.startedAt,original.startedAt);
  assert.equal(squad[0].physicalContact?.anchor.point.x,
    teammateShoulderPoint(squad[1]).x);
  assert.equal(squad[1].p.x,169,'contact may never displace leader');
 }finally{clean();}
});
test('A3.7 no enemy, corpse, opposite-facing, occluded or remote contact',()=>{
 const {s,squad}=setup('stack-shoulder',2);
 try{
  const a=squad[0],lead=squad[1],world=sessionWorldGeometry(s);
  assert.ok(chooseTeammateSupport(s,a,world,null));
  lead.heading=Math.PI;
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
  lead.heading=0;lead.health=0;
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
  lead.health=4;lead.side='red';
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
  lead.side='blue';
  assert.equal(chooseTeammateSupport(s,a,
   {...world,isClear:()=>false},null),null);
  lead.p.x+=50;
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
 }finally{clean();}
});
test('A3.7 competing door, reload, injury, sprint and active aim release',()=>{
 for(const action of ['door','reload','aim','sprint','injury']){
  const {s,a}=setup('stack-shoulder',2);
  try{
   advanceContextualSupportContacts(s);
   assert.equal(a.physicalContact?.intent,'teammate');
   if(action==='door')a.doorHandContact={
     doorId:'fake',fraction:.75,mode:'panel',point:{...a.p},
     startedAt:s.seconds,releasedAt:null};
   if(action==='reload')a.reload=1.5;
   if(action==='aim')a.aim=.99;
   if(action==='sprint')a.pace='run';
   if(action==='injury'){
    a.lastHitAt=s.seconds;a.lastHitRegion='torso';
   }
   s.seconds+=1/60;
   advanceContextualSupportContacts(s);
   assert.ok(a.physicalContact?.releasedAt!==null,
     action+' must release support hand');
  }finally{clean();}
 }
});
test('A3.7 replay deep copies contact and samples deterministic release',()=>{
 const {s,a}=setup('stack-shoulder',2);
 try{
  advanceContextualSupportContacts(s);
  const f=snapshot(s);
  const recorded=f.actors.find(x=>x.id===a.id).physicalContact;
  assert.ok(recorded&&recorded.anchor.target==='teammate');
  assert.notStrictEqual(recorded,a.physicalContact);
  assert.notStrictEqual(recorded.anchor.point,a.physicalContact.anchor.point);
  const before=physicalContactWeight(recorded,s.seconds+.25);
  assert.equal(before,physicalContactWeight(recorded,s.seconds+.25));
  a.aim=.98;s.seconds+=1/60;
  advanceContextualSupportContacts(s);
  assert.equal(recorded.releasedAt,null,
    'stored historical attachment must remain immutable');
  const p={seconds:s.seconds,lastThrowAt:-100,lastDoorAt:-100,
    doorMethod:'open',doorGrip:null,physicalContact:a.physicalContact,
    reload:0,reloadDuration:1,weapon:'carbine',treatmentActive:false,
    down:false,surrender:false,injury:0,aiming:false,firing:false};
  const actionState=resolveOperatorActionState(p,0,false);
  assert.equal(actionState.handOwners.action,'hold');
  assert.ok(actionState.physicalContact,
    'release retains fading support contact under noncompeting state');
 }finally{clean();}
});
test('A3.6–A3.7 production 60 Hz step updates contact without editing plan',()=>{
 const {s,a}=setup('brace-wall',1);
 try{
  const original=JSON.stringify(a.plan);
  stepSession(s,1/60);
  assert.equal(JSON.stringify(a.plan),original);
  assert.ok(a.physicalContact?.intent==='brace'||a.physicalContact===null,
   'motor, target or action is allowed to veto, not invent contact');
 }finally{clean();}
});

test('A3.7 archived film with no anchor clears stale current hand on seek',()=>{
 const {s,a}=setup('stack-shoulder',2);
 try{
  advanceContextualSupportContacts(s);
  assert.ok(a.physicalContact);
  const historic=snapshot(s);
  // Backwards compatibility: an old film never recorded this field.
  for(const frame of historic.actors)delete frame.physicalContact;
  applyReplayFrame(s,historic);
  assert.equal(a.physicalContact,null);
  assert.equal(s.seconds,historic.t);
 }finally{clean();}
});
