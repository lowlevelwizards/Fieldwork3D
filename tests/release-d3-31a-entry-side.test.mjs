import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,hasInterruptedSquadEntry,
 resumeInterruptedSquadEntry} from '../src/breach-game.ts';
import {failCurrentOrder} from '../src/breach-order-lifecycle.ts';
import {snapshotDoorInterruption,interruptedDoorApproachSide}
 from '../src/breach-door-interruption.ts';

const coordinate=(door,side)=>{
 const center={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 const delta={x:door.b.x-door.a.x,y:door.b.y-door.a.y};
 const length=Math.hypot(delta.x,delta.y);
 return {x:center.x-delta.y/length*side*35,
         y:center.y+delta.x/length*side*35};
};
test('D3.31A: geometric side provenance uses actual door endpoints, never lock',()=>{
 const door={a:{x:5,y:10},b:{x:55,y:10},locked:true};
 assert.equal(interruptedDoorApproachSide(door,{x:30,y:50}),1);
 assert.equal(interruptedDoorApproachSide(door,{x:30,y:-30}),-1);
 assert.equal(interruptedDoorApproachSide(door,{x:30,y:10}),0);
 door.locked=false;
 assert.equal(interruptedDoorApproachSide(door,{x:30,y:50}),1);
});
test('D3.31A: cancellation freezes the real encounter approach side',()=>{
 const s=newSession(0,undefined,'full-view'),door=s.doors[0];
 const members=team(s).slice(0,2);
 for(const [i,a] of members.entries()){
  a.p=coordinate(door,i===0?1:-1);
  const node={id:700+i,kind:'move',p:{...a.p},entryDoorId:door.id};
  a.plan=[node];
  failCurrentOrder(s,a,node,'PATH BLOCKED · DOOR LOCKED',()=>{},door.id);
 }
 assert.equal(members[0].interruptedDoorPlan.approachSide,1);
 assert.equal(members[1].interruptedDoorPlan.approachSide,-1);
});
test('D3.31A: same door but opposite physical approaches are NOT one squad',()=>{
 // The legacy unseeded study has only two blue actors. A generated site
 // provides the real four-person team needed for this three-member case.
 const s=newSession(0,31175,'full-view','small'),door=s.doors[0];
 const members=team(s).slice(0,3);
 door.locked=false;door.jammed=false;door.wedged=false;door.heldBy=null;
 for(const [i,a] of members.entries()){
  a.interruptedDoorPlan={
   doorId:door.id,sourceOrderId:800+i,at:5,reason:'locked',
   approachSide:i===1?-1:1,
   original:[{id:800+i,kind:'move',p:{...a.p},entryDoorId:door.id}]
  };
 }
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),true,
  'the two same-side incidents can be resumed together');
 assert.equal(hasInterruptedSquadEntry(s,members[1].id),false,
  'the opposite-side member must remain independent');
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(members[0].interruptedDoorPlan,null);
 assert.equal(members[2].interruptedDoorPlan,null);
 assert.ok(members[1].interruptedDoorPlan);
});
test('D3.31A: replayed/legacy interruption without side retains compatibility',()=>{
 const node={id:1,kind:'move',p:{x:10,y:12},entryDoorId:'D'};
 const snap=snapshotDoorInterruption(node,[node],
  'PATH BLOCKED · DOOR LOCKED',5,'D');
 assert.equal(snap.approachSide,undefined);
 const attributed=snapshotDoorInterruption(node,[node],
  'PATH BLOCKED · DOOR LOCKED',5,'D',null,1);
 assert.equal(attributed.approachSide,1);
});
