import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team} from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {preOpenDoorCandidate,preOpenDoorEligible}
 from '../src/breach-preopen-contact.ts';
import {advanceContextualSupportContacts,chooseTeammateSupport,
 teammateShoulderPoint,SUPPORT_RELEASE_WINDOW}
 from '../src/breach-contextual-support-contact.ts';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';
import {directOperatorPose} from '../src/breach-pose-director.ts';
import {physicalContactWeight} from '../src/breach-physical-contact-anchor.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

const setup=(scenario='brace-frame',n=1)=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,scenario,operators:n,
  intent:'hold'});
 s.seconds=2;
 return {s,a:team(s)[0],squad:team(s)};
};
const assign=(s,a)=>{
 const door=s.doors[0];
 a.plan=[{id:91011,kind:'door',doorId:door.id,
  method:'open',p:{...a.p}}];
 a.velocity=0;a.aim=0;a.targetId=null;a.pace='walk';
 return door;
};
test('A3.10 explicit OPEN near handle creates physical pre-contact but never edits plan',()=>{
 const {s,a}=setup();
 try{
  const d=assign(s,a),previous=JSON.stringify(a.plan);
  assert.equal(preOpenDoorEligible(a,d),true);
  const c=preOpenDoorCandidate(s,a,d,sessionWorldGeometry(s));
  assert.ok(c,'physical reach to nearest actual door/frame is required');
  assert.equal(c.intent,'door');
  assert.equal(c.anchor.id,d.id+':pre-open');
  assert.equal(c.anchor.target,'door');
  assert.equal(c.limb,'support-hand');
  assert.ok(c.anchor.point.y>=18);
  assert.equal(JSON.stringify(a.plan),previous,'visual queue cannot edit order');
  advanceContextualSupportContacts(s);
  assert.equal(a.physicalContact?.anchor.id,c.anchor.id);
  const original=a.physicalContact;
  s.seconds+=.25;
  advanceContextualSupportContacts(s);
  assert.equal(a.physicalContact.startedAt,original.startedAt);
  assert.equal(JSON.stringify(a.plan),previous);
 }finally{activateSite(null);}
});
test('A3.10 queued open selects high ready, single door support hand, no muzzle authority',()=>{
 const {s,a}=setup();
 try{
  assign(s,a);advanceContextualSupportContacts(s);s.seconds+=.25;
  const c=a.physicalContact;
  assert.ok(c&&physicalContactWeight(c,s.seconds)>.95);
  const pose={seconds:s.seconds,lastThrowAt:-100,lastDoorAt:-100,
   doorPoint:{x:c.anchor.point.x,y:c.anchor.point.z},
   doorMethod:'open',doorGrip:null,physicalContact:c,
   reload:0,reloadDuration:1,weapon:'carbine',
   treatmentActive:false,down:false,surrender:false,
   injury:0,aiming:false,firing:false,aimBlend:0,
   obstruction:false,handlingIntent:'door',velocity:0};
  const state=resolveOperatorActionState(pose,0,false);
  assert.equal(state.handOwners.left,'door');
  assert.equal(state.handOwners.right,'weapon');
  const decision=directOperatorPose(pose,{
   moving:0,downProgress:0,pushActive:false,receivingBash:false,
   previousHandlingAt:-100
  });
  assert.equal(decision.handling,'high');
  assert.equal(directOperatorPose({...pose,obstruction:true},{
   moving:0,downProgress:0,pushActive:false,receivingBash:false,
   previousHandlingAt:-100
  }).handling,'short','wall/weapon clearance must outrank decorative high ready');
 }finally{activateSite(null);}
});
test('A3.10 cancel, open, reload, aim or distance release without phantom hand',()=>{
 for(const state of ['cancel','opened','reload','aim','far','sprint']){
  const {s,a}=setup();
  try{
   const d=assign(s,a);advanceContextualSupportContacts(s);
   assert.ok(a.physicalContact,state+' acquired prior to interruption');
   const old=a.physicalContact;
   if(state==='cancel')a.plan=[];
   if(state==='opened')d.open=true;
   if(state==='reload')a.reload=1;
   if(state==='aim')a.aim=.95;
   if(state==='far')a.p={x:a.p.x-90,y:a.p.y};
   if(state==='sprint')a.pace='run';
   s.seconds+=1/60;advanceContextualSupportContacts(s);
   assert.equal(a.physicalContact?.releasedAt,s.seconds,state);
   assert.equal(old.releasedAt,null,'recorded historical contact is immutable');
   s.seconds+=SUPPORT_RELEASE_WINDOW+.01;
   advanceContextualSupportContacts(s);
   assert.equal(physicalContactWeight(a.physicalContact,s.seconds),0,
    state+' returns hand from the door after brief release blend');
   if(state==='cancel'){
    assert.equal(a.physicalContact?.intent,'door',
      'neutral return window suppresses immediate replacement by a frame brace');
    const p={seconds:s.seconds,lastThrowAt:-100,lastDoorAt:-100,
      doorMethod:'open',physicalContact:a.physicalContact,
      reload:0,reloadDuration:1,weapon:'carbine',treatmentActive:false,
      down:false,surrender:false,injury:0,aiming:false,firing:false,
      aimBlend:0,handlingIntent:'hold',obstruction:false};
    assert.equal(resolveOperatorActionState(p,0,false).handOwners.left,'weapon');
    assert.notEqual(directOperatorPose(p,{moving:0,downProgress:0,
      pushActive:false,receivingBash:false,previousHandlingAt:-100
    }).handling,'high');
   }
  }finally{activateSite(null);}
 }
});
test('A3.10 preopen rejects impossible source and never invents a handle through wall',()=>{
 const {s,a}=setup();
 try{
  const d=assign(s,a),world=sessionWorldGeometry(s);
  assert.equal(preOpenDoorCandidate(s,a,d,{...world,isClear:()=>false}),null);
  d.kind='sliding';assert.equal(preOpenDoorCandidate(s,a,d,world),null);
  d.kind='hinged';a.p.x-=100;
  assert.equal(preOpenDoorCandidate(s,a,d,world),null);
 }finally{activateSite(null);}
});
test('A3.10 four-person stack reaches shoulder TOP, upper fallback never rib height',()=>{
 const {s,squad}=setup('stack-shoulder',4);
 try{
  const world=sessionWorldGeometry(s);
  advanceContextualSupportContacts(s);
  for(let i=0;i<3;i++){
   const lead=squad[i+1],point=teammateShoulderPoint(lead);
   const actual=squad[i].physicalContact;
   assert.equal(actual?.intent,'teammate',i);
   assert.equal(actual.anchor.id,lead.id);
   assert.ok(point.y>=32,'standing shoulder-cap anchor, not rear rib');
   assert.ok(actual.anchor.point.y>=29,
    'fallback is upper shoulder, never old 21-unit rib level');
   assert.deepEqual(actual.anchor.point,point);
   assert.ok(actual.anchor.normal.y>.9,
    'palm faces downward onto the top of the leader shoulder');
  }
  const a=squad[0],lead=squad[1];
  const occluded={...world,isClear:()=>false};
  assert.equal(chooseTeammateSupport(s,a,occluded,null),null);
  lead.health=0;
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
 }finally{activateSite(null);}
});
test('A3.10 preopen door and high shoulder anchors rewind without gameplay mutation',()=>{
 const {s,a}=setup();
 try{
  assign(s,a);advanceContextualSupportContacts(s);
  s.seconds+=.3;const saved=snapshot(s);
  const contact=saved.actors.find(o=>o.id===a.id).physicalContact;
  assert.equal(contact?.anchor.id,s.doors[0].id+':pre-open');
  a.plan=[];s.seconds+=1/60;advanceContextualSupportContacts(s);
  assert.notEqual(a.physicalContact?.releasedAt,null);
  applyReplayFrame(s,saved);
  assert.equal(a.physicalContact.anchor.id,contact.anchor.id);
  assert.equal(a.physicalContact.releasedAt,null);
  assert.ok(physicalContactWeight(a.physicalContact,s.seconds)>.95);
 }finally{activateSite(null);}
});
