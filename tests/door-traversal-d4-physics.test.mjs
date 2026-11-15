import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireDoorHandContact,maintainDoorHandContact,releaseDoorHandContact,
 DOOR_HAND_ACQUIRE_REACH,DOOR_HAND_RELEASE_DURATION,doorHandPoint}
 from '../src/breach-door-hand-contact.ts';
import {initDoor,handlePoint,PUSHED_OPEN_LIMIT} from '../src/breach-door.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
const p=(x,y)=>({x,y});
const door=()=>{const d=initDoor({id:'ENTRY',a:p(290,260),
 b:p(332,260),kind:'hinged',hinge:'a',swing:1,
 open:true,openedAt:0},0);d.openFraction=.70;return d};
function setup(){
 const d=door(),near=handlePoint(d);
 const a={id:'rook',side:'blue',health:4,p:p(near.x,near.y-17),
  aim:0,targetId:null,pace:'walk',reload:0,treatmentActive:false,
  surrendered:false,traversal:null,traversalPending:null,
  flashUntil:0,lastThrowAt:-100,lastBashAt:-100,
  plan:[{id:1,kind:'move',p:p(310,360)}],
  doorTraversal:{doorId:d.id,authoredOrderId:1,phase:'clear-leaf',
    approachSide:-1,maneuver:'direct',handContact:false},
  doorHandContact:null,lastDoorAt:-100,lastDoorId:null,
  lastDoorMethod:'open'};
 const s={seconds:2,doors:[d],operators:[a],
  site:doorRangeSite('ajar-outward'),coverState:[],objectRevision:0};
 return {s,a,d};
}
test('D4 grip attaches at real moving-leaf position and follows hinge',()=>{
 const {s,a,d}=setup();
 assert.ok(DOOR_HAND_ACQUIRE_REACH<40);
 assert.equal(acquireDoorHandContact(s,a,d,false),false,
  'visual proximity alone cannot create grip without physical assist');
 assert.equal(acquireDoorHandContact(s,a,d,true),true);
 const grip=a.doorHandContact;
 assert.equal(grip?.mode,'handle');
 assert.equal(grip?.releasedAt,null);
 assert.deepEqual(grip.point,doorHandPoint(d,.82));
 assert.equal(a.doorTraversal.handContact,true);
 d.openFraction=.81;s.seconds+=1/60;
 maintainDoorHandContact(s,a);
 assert.equal(a.doorHandContact,grip,'stable contact object, no per-tick allocation');
 assert.deepEqual(grip.point,doorHandPoint(d,.82));
 assert.equal(d.pushTarget,PUSHED_OPEN_LIMIT);
 assert.equal(a.doorTraversal.maneuver,'grab-and-hold');
});
test('D4 support hand releases for combat, reload, lost reach and order end',()=>{
 for(const interrupt of [
  ({a})=>{a.reload=2;},
  ({a})=>{a.targetId='guard';},
  ({a})=>{a.aim=.8;},
  ({a})=>{a.pace='run';},
  ({a})=>{a.p=p(20,20);},
  ({a})=>{a.plan=[];},
  ({a})=>{a.doorTraversal.phase='release';}
 ]){
  const f=setup();assert.equal(acquireDoorHandContact(f.s,f.a,f.d,true),true);
  interrupt(f);f.s.seconds+=1/60;
  maintainDoorHandContact(f.s,f.a);
  assert.notEqual(f.a.doorHandContact.releasedAt,null);
  assert.equal(f.a.doorTraversal.handContact,false);
  f.s.seconds+=DOOR_HAND_RELEASE_DURATION+.02;
  maintainDoorHandContact(f.s,f.a);
  assert.equal(f.a.doorHandContact,null);
 }
});
test('D4 cannot grab a closed, wedged or distant handle or force a hinge',()=>{
 const {s,a,d}=setup();
 d.open=false;
 assert.equal(acquireDoorHandContact(s,a,d,true),false);
 d.open=true;d.wedged=true;
 assert.equal(acquireDoorHandContact(s,a,d,true),false);
 d.wedged=false;a.p=p(40,40);
 assert.equal(acquireDoorHandContact(s,a,d,true),false);
 assert.equal(a.doorHandContact,null);
 assert.equal(d.pushTarget,1);
});
test('D4 grip can be released before next simulation frame without hinge mutation',()=>{
 const {s,a,d}=setup();
 assert.ok(acquireDoorHandContact(s,a,d,true));
 const angle=d.openFraction;
 releaseDoorHandContact(a,s.seconds+.05);
 assert.equal(a.doorHandContact.releasedAt,s.seconds+.05);
 assert.equal(d.openFraction,angle);
});

test('D3.9B3 explicit OPEN uses support hand without forcing full 1.55 swing',()=>{
 const {s,a,d}=setup();
 a.plan=[{id:7,kind:'door',doorId:d.id,method:'open',p:p(310,360)}];
 a.doorTraversal=null;
 assert.equal(acquireDoorHandContact(s,a,d,true),true);
 const initial=d.pushTarget;
 s.seconds+=1/60;maintainDoorHandContact(s,a);
 assert.equal(d.pushTarget,initial);
 a.plan[0].method='kick';maintainDoorHandContact(s,a);
 assert.notEqual(a.doorHandContact?.releasedAt,null);
});
