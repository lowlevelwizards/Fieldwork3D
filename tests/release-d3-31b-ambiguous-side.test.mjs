import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,hasInterruptedSquadEntry,
 resumeInterruptedSquadEntry} from '../src/breach-game.ts';

function fixture(sides){
 const s=newSession(0,31175,'full-view','small'),door=s.doors[0];
 const members=team(s).slice(0,sides.length);
 assert.equal(members.length,sides.length,'test needs a four-operator site');
 door.locked=false;door.jammed=false;door.wedged=false;door.heldBy=null;
 for(const [i,a] of members.entries()){
  a.interruptedDoorPlan={
   doorId:door.id,sourceOrderId:600+i,at:4,reason:'locked',
   ...(sides[i]===undefined?{}:{approachSide:sides[i]}),
   original:[{id:600+i,kind:'move',p:{...a.p},entryDoorId:door.id}]
  };
 }
 return {s,members};
}
test('D3.31B: threshold-plane unknown side cannot bridge opposite known approaches',()=>{
 const {s,members}=fixture([1,-1,0,1]);
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(hasInterruptedSquadEntry(s,members[1].id),false);
 assert.equal(hasInterruptedSquadEntry(s,members[2].id),false);
 assert.equal(resumeInterruptedSquadEntry(s,members[2].id),false);
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(members[0].interruptedDoorPlan,null);
 assert.equal(members[3].interruptedDoorPlan,null);
 assert.ok(members[1].interruptedDoorPlan);
 assert.ok(members[2].interruptedDoorPlan);
});
test('D3.31B: legacy missing provenance cannot join known-side incidents',()=>{
 const {s,members}=fixture([undefined,1,-1,undefined]);
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(hasInterruptedSquadEntry(s,members[1].id),false);
 assert.equal(hasInterruptedSquadEntry(s,members[2].id),false);
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(members[0].interruptedDoorPlan,null);
 assert.equal(members[3].interruptedDoorPlan,null);
 assert.ok(members[1].interruptedDoorPlan);
 assert.ok(members[2].interruptedDoorPlan);
});
test('D3.31B: on-plane incidents only group with other on-plane incidents',()=>{
 const {s,members}=fixture([0,0,1,-1]);
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(hasInterruptedSquadEntry(s,members[2].id),false);
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),true);
 assert.ok(members[2].interruptedDoorPlan);
 assert.ok(members[3].interruptedDoorPlan);
});
test('D3.31B: missing provenance and on-plane are distinct retry cohorts',()=>{
 const {s,members}=fixture([undefined,0,1,-1]);
 for(const a of members){
  assert.equal(hasInterruptedSquadEntry(s,a.id),false);
  assert.equal(resumeInterruptedSquadEntry(s,a.id),false);
  assert.ok(a.interruptedDoorPlan,'rejected retry preserves individual recovery');
 }
});
