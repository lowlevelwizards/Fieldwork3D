import test from 'node:test';
import assert from 'node:assert/strict';
import {beginDoorGrip,updateDoorGrip,canMaintainDoorGrip}
 from '../src/breach-door-grip.ts';
import {initDoor,handlePoint,DOOR_REACH}
 from '../src/breach-door.ts';
const p=(x,y)=>({x,y});
const door=()=>{const d=initDoor({id:'ENTRY',a:p(290,260),b:p(332,260),
 open:true,hinge:'a',swing:1,kind:'hinged',openedAt:0},0);
 d.openFraction=.9;return d;};
const actor=(door,at=handlePoint(door))=>({
 id:'rook',side:'blue',health:4,surrendered:false,p:{...at},
 pace:'walk',reload:0,treatmentActive:false,lastThrowAt:-100,traversal:null,
 traversalPending:null,lastShotAt:-100,
 plan:[{id:41,kind:'move',p:p(310,355)}],
 doorTraversal:{doorId:'ENTRY',authoredOrderId:41,phase:'clear-leaf',
  maneuver:'outside-leaf',handContact:false,handContactSince:null,
  destination:p(310,355)}
});
test('D4 support hand starts only after contact on a truly reachable hinge',()=>{
 const d=door(),a=actor(d);
 assert.equal(canMaintainDoorGrip(a,d,2),false);
 assert.equal(beginDoorGrip(a,d,2),true);
 assert.equal(a.doorTraversal.handContact,true);
 assert.equal(a.doorTraversal.handContactSince,2);
 assert.equal(updateDoorGrip(a,d,2.5),true);
 const old=handlePoint(d);
 d.openFraction=1.16;
 // The handle itself moves with the physical hinge; actor may follow it.
 a.p=handlePoint(d);
 assert.notDeepEqual(a.p,old);
 assert.equal(updateDoorGrip(a,d,3.2),true);
 assert.equal(a.doorTraversal.handContactSince,2);
 a.p=p(a.p.x+DOOR_REACH+2,a.p.y);
 assert.equal(updateDoorGrip(a,d,3.3),false);
 assert.equal(a.doorTraversal.handContact,false);
 assert.equal(a.doorTraversal.handContactSince,null);
});
test('D4 no remote grip, no grip through wedged leaf or closed door',()=>{
 const d=door(),a=actor(d,p(30,30));
 assert.equal(beginDoorGrip(a,d,1),false);
 assert.equal(a.doorTraversal.handContact,false);
 a.p=handlePoint(d);d.wedged=true;
 assert.equal(beginDoorGrip(a,d,2),false);
 d.wedged=false;d.open=false;
 assert.equal(beginDoorGrip(a,d,2),false);
});
test('D4 release when the operator needs the support hand for combat',()=>{
 for(const change of [
  {reload:1},{treatmentActive:true},{pace:'run'},
  {lastShotAt:4.8},{lastThrowAt:4.8},{health:0},{surrendered:true}
 ]){
  const d=door(),a=actor(d);
  assert.equal(beginDoorGrip(a,d,4),true);
  Object.assign(a,change);
  assert.equal(updateDoorGrip(a,d,5),false,JSON.stringify(change));
 }
});
test('D4 an explicit order replacement releases immediately',()=>{
 const d=door(),a=actor(d);
 assert.equal(beginDoorGrip(a,d,2),true);
 a.plan[0]={id:42,kind:'door',method:'close',p:p(310,260)};
 assert.equal(updateDoorGrip(a,d,2.1),false);
});

test('D4 release retires old reach cue instead of grabbing remotely',()=>{
 const d=door(),a=actor(d);
 a.lastDoorId=d.id;a.lastDoorAt=3;
 assert.equal(beginDoorGrip(a,d,3),true);
 a.p=p(80,90);
 assert.equal(updateDoorGrip(a,d,3.08),false);
 assert.ok(a.lastDoorAt<=3.08-1.12,
   'the old timed reach may not extend toward a now-distant handle');
});
