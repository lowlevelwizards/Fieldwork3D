import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,undoPlan,redoPlan,hasInterruptedSquadEntry,
 resumeInterruptedSquadEntry} from '../src/breach-game.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {dispatchTacticalContextCommand} from '../src/breach-tactical-context-command.ts';
const prepare=()=>{
 const s=newSession(0,undefined,'full-view'),members=team(s).slice(0,2);
 const door=s.doors[0];
 door.locked=false;door.jammed=false;door.wedged=false;door.heldBy=null;
 for(const [i,a] of members.entries()){
  a.plan=[{id:900+i,kind:'look',p:{...a.p},facing:0}];
  a.interruptedDoorPlan={doorId:door.id,sourceOrderId:500+i,
   at:4,reason:'locked',
   original:[{id:500+i,kind:'move',p:{...a.p},entryDoorId:door.id}]};
 }
 return {s,members,door};
};
test('D3.30H: explicit group retry restores same-door original goals atomically',()=>{
 const {s,members}=prepare();
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),true);
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),true);
 for(const [i,a] of members.entries()){
  assert.deepEqual(a.plan.map(n=>n.kind),['move','look']);
  assert.deepEqual(a.plan[0].p,a.plan[1].p);
  assert.notEqual(a.plan[0].id,500+i);
  assert.equal(a.interruptedDoorPlan,null);
 }
 assert.equal(undoPlan(s,members[0].id),true);
 for(const a of members)assert.deepEqual(a.plan.map(n=>n.kind),['look']);
 assert.equal(redoPlan(s,members[1].id),true);
 for(const a of members)assert.deepEqual(a.plan.map(n=>n.kind),['move','look']);
});
test('D3.30H: one ineligible operator rejects whole group with no partial edits',()=>{
 const {s,members,door}=prepare();
 const plans=members.map(a=>a.plan.map(n=>n.id));
 const originalNextId=s.nextId;
 door.jammed=true;
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),false);
 assert.deepEqual(members.map(a=>a.plan.map(n=>n.id)),plans);
 assert.equal(s.nextId,originalNextId);
 assert.equal(members.every(a=>!!a.interruptedDoorPlan),true);
 door.jammed=false;
 members[1].interruptedDoorPlan.doorId='OTHER';
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),false);
 assert.equal(resumeInterruptedSquadEntry(s,members[0].id),false);
});
test('D3.30H: squad affordance never leaks current lock and solo stays present',()=>{
 const {s,members,door}=prepare();
 const options={door:false,node:false,flashRemaining:1,posture:'stand',
  pace:'walk',firePolicy:'engage',reserve:10,magazine:10,
  resumeAvailable:true,resumeSquadAvailable:hasInterruptedSquadEntry(s,members[0].id)};
 const ids=contextActionChoices(options).map(x=>x.id);
 assert.deepEqual(ids.slice(0,2),['ctxResumeEntry','ctxResumeSquad']);
 door.locked=!door.locked;door.jammed=!door.jammed;
 assert.equal(hasInterruptedSquadEntry(s,members[0].id),true);
 assert.deepEqual(contextActionChoices(options).map(x=>x.id),ids);
});
test('D3.30H: palette command uses same authoritative atomic transaction',()=>{
 const {s,members}=prepare(),a=members[0];
 const result=dispatchTacticalContextCommand({state:s,selected:a.id,
   actor:a,node:undefined,door:undefined,action:'ctxResumeSquad',
   selectedActiveWatch:false,medicalCandidate:()=>null});
 assert.equal(result.outcome,'accepted');
 assert.equal(members.every(member=>member.plan[0]?.kind==='move'),true);
});
