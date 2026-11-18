import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,undoPlan,redoPlan,
 resumeInterruptedDoorPlan,resumeInterruptedSquadEntry} from '../src/breach-game.ts';

function prepare(){
 const s=newSession(0,undefined,'full-view'),members=team(s).slice(0,2);
 const door=s.doors[0];
 door.locked=false;door.jammed=false;door.wedged=false;door.heldBy=null;
 for(const [i,a] of members.entries()){
  a.plan=[{id:700+i,kind:'look',p:{...a.p},facing:0}];
  a.interruptedDoorPlan={doorId:door.id,sourceOrderId:500+i,
   at:5,reason:'locked',approachSide:1,
   original:[{id:500+i,kind:'move',p:{...a.p},entryDoorId:door.id}]};
 }
 return {s,members};
}
test('D3.31C: solo resume undo restores saved incident and redo consumes it',()=>{
 const {s,members}=prepare(),a=members[0];
 const before=structuredClone(a.interruptedDoorPlan);
 assert.equal(resumeInterruptedDoorPlan(s,a.id),true);
 assert.equal(a.interruptedDoorPlan,null);
 assert.deepEqual(a.plan.map(n=>n.kind),['move','look']);
 assert.equal(undoPlan(s,a.id),true);
 assert.deepEqual(a.interruptedDoorPlan,before);
 assert.deepEqual(a.plan.map(n=>n.kind),['look']);
 assert.equal(redoPlan(s,a.id),true);
 assert.equal(a.interruptedDoorPlan,null);
 assert.deepEqual(a.plan.map(n=>n.kind),['move','look']);
});
test('D3.31C: grouped undo and redo preserve both original incident snapshots',()=>{
 const {s,members}=prepare();
 const original=members.map(a=>structuredClone(a.interruptedDoorPlan));
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(undoPlan(s,members[1].id),true);
 assert.deepEqual(members.map(a=>a.interruptedDoorPlan),original);
 for(const a of members)assert.deepEqual(a.plan.map(n=>n.kind),['look']);
 assert.equal(redoPlan(s,members[0].id),true);
 for(const a of members){
  assert.equal(a.interruptedDoorPlan,null);
  assert.deepEqual(a.plan.map(n=>n.kind),['move','look']);
 }
});
test('D3.31C: rejected group leaves incident snapshots and history untouched',()=>{
 const {s,members}=prepare();
 const original=members.map(a=>structuredClone(a.interruptedDoorPlan));
 s.doors[0].jammed=true;
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),false);
 assert.deepEqual(members.map(a=>a.interruptedDoorPlan),original);
 assert.equal(s.squadEntryUndo,null);
 assert.equal(members.every(a=>a.history.undo.length===0),true);
});
test('D3.31C: new retry after undo branches history without stale redo',()=>{
 const {s,members}=prepare(),a=members[0];
 assert.equal(resumeInterruptedDoorPlan(s,a.id),true);
 assert.equal(undoPlan(s,a.id),true);
 assert.ok(a.interruptedDoorPlan);
 assert.equal(resumeInterruptedDoorPlan(s,a.id),true);
 assert.equal(redoPlan(s,a.id),false);
 assert.equal(a.interruptedDoorPlan,null);
});
