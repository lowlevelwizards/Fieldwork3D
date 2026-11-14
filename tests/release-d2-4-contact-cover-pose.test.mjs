/** D2.4 fixed-tick contact CPU hotpath acceptance: no extra simulation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {chooseEnvironmentSupport,chooseTeammateSupport,
 advanceContextualSupportContacts}
 from '../src/breach-contextual-support-contact.ts';
import {selectPhysicalContact,selectSinglePhysicalContact}
 from '../src/breach-physical-contact-anchor.ts';
import {resolvePoseContactOwners} from '../src/breach-pose-contacts.ts';
const setup=(scenario='brace-wall',operators=1)=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,scenario,operators,intent:'hold'});
 s.seconds=2;
 return {s,a:team(s)[0]};
};
const owners=()=>resolvePoseContactOwners({
 surrender:false,down:false,downProgress:0,treatmentActive:false,
 reloadActive:false,reloadProgress:0,reloadMode:'emergency',
 throwActive:false,pushActive:false,woundedGuard:false,doorActive:false
});
test('D2.4.1 unreachable wall/cover contacts perform zero LOS probes',()=>{
 const {s,a}=setup();
 try{
  a.p={x:100,y:100};a.heading=0;a.posture='stand';
  s.doors=[];
  let visibility=0;
  const far={a:{x:121,y:119},b:{x:121,y:122}};
  const world={
   someWallNearPoint:(_p,_r,cb)=>{cb(far,0);return false;},
   someCoverNearPoint:()=>false,
   isClear:()=>{visibility++;return true;}
  };
  assert.equal(chooseEnvironmentSupport(s,a,world,null),null);
  assert.equal(visibility,0,'reach must reject before any world ray');
  const near={a:{x:112,y:99},b:{x:112,y:101}};
  world.someWallNearPoint=(_p,_r,cb)=>{cb(near,0);return false;};
  assert.ok(chooseEnvironmentSupport(s,a,world,null));
  assert.equal(visibility,1,'eligible contact still checks exact real LOS');
  world.isClear=()=>{visibility++;return false;};
  assert.equal(chooseEnvironmentSupport(s,a,world,null),null);
  assert.equal(visibility,2,'occlusion still vetoes a reachable contact');
 }finally{activateSite(null);}
});
test('D2.4.1 unreachable aligned teammate performs zero world probes',()=>{
 const {s,a}=setup('stack-shoulder',2);
 try{
  const lead=team(s)[1];
  a.p={x:100,y:100};a.heading=0;a.posture='stand';
  lead.p={x:133,y:110};lead.heading=0;lead.posture='stand';
  let probes=0;
  const world={isClear:()=>{probes++;return true;}};
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
  assert.equal(probes,0);
  lead.p={x:120,y:100};
  assert.ok(chooseTeammateSupport(s,a,world,null));
  assert.equal(probes,1);
  world.isClear=()=>{probes++;return false;};
  assert.equal(chooseTeammateSupport(s,a,world,null),null);
  assert.equal(probes,2);
 }finally{activateSite(null);}
});
test('D2.4.1 direct single arbitration matches existing general selection',()=>{
 const c={intent:'brace',limb:'support-hand',anchor:{
   target:'surface',id:'wall:test',point:{x:10,y:19,z:0},
   normal:{x:0,y:0,z:1}},startedAt:1,releasedAt:null};
 const claim={contact:c,reach:{from:{x:0,y:19,z:0},
   acquireReach:19.6,retainReach:22.5,lineClear:true}};
 const hold=owners();
 for(const now of [0,1,2,3]){
  assert.deepEqual(selectSinglePhysicalContact(claim,hold,now),
    selectPhysicalContact([claim],hold,now));
 }
 const impossible={...claim,reach:{...claim.reach,lineClear:false}};
 assert.equal(selectSinglePhysicalContact(impossible,hold,2),null);
 const same={...claim,contact:{...c,anchor:{...c.anchor,point:{
   x:22,y:19,z:0}}}};
 assert.equal(selectSinglePhysicalContact(same,hold,2),null);
 assert.equal(selectSinglePhysicalContact(same,hold,2,c)?.anchor.id,'wall:test');
});
test('D2.4.1 idle release never requests world geometry to decide action',()=>{
 const {s,a}=setup('stack-shoulder',2);
 try{
  advanceContextualSupportContacts(s);
  assert.ok(a.physicalContact);
  a.reload=1.5;s.seconds+=1/60;
  advanceContextualSupportContacts(s);
  assert.ok(a.physicalContact?.releasedAt!==null);
 }finally{activateSite(null);}
});
