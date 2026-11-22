import test from 'node:test';
import assert from 'node:assert/strict';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {selectedDoorStackFormation,cycleDoorStackFormation}
 from '../src/breach-stack-formation-selection.ts';
const base={door:true,node:false,flashRemaining:2,posture:'stand',
 pace:'walk',firePolicy:'engage',reserve:30,magazine:30};
test('M4.9 selection cycles five formations per door/session without authored edits',()=>{
 const s={plan:[]},other={plan:[]};
 assert.equal(selectedDoorStackFormation(s,'FRONT'),'auto');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'left');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'right');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'split');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'angled');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'auto');
 assert.equal(selectedDoorStackFormation(s,'D2'),'auto');
 assert.equal(selectedDoorStackFormation(other,'FRONT'),'auto');
 assert.deepEqual(s.plan,[]);
});
test('M4.9 internal formation and entry controls stay out of the player palette',()=>{
 for(const state of [{...base},{...base,doorPartial:true},{...base,doorOpen:true}]){
  const actions=contextActionChoices({...state,formationEditable:true,
    stackFormation:'split',resumeAvailable:true,resumeSquadAvailable:true});
  assert.ok(actions.some(x=>x.id==='ctxOpen'||x.id==='ctxClose'));
  assert.ok(actions.every(x=>!['ctxFormationCycle','ctxStackTeam',
    'ctxSquadEntry','ctxResumeEntry','ctxResumeSquad'].includes(x.id)));
 }
});

import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';
test('M4.9 real door palette command authors a squad stack using the selected variant',()=>{
 const s=newSession(0,33717,'full-view');
 try{
  const a=team(s)[0],door=s.doors.find(x=>x.id==='FRONT');
  assert.ok(door);
  const command=action=>dispatchTacticalContextCommand({
   state:s,selected:a.id,actor:a,node:undefined,door,
   action,selectedActiveWatch:false,medicalCandidate:()=>null
  });
  const before=team(s).map(x=>x.plan.length);
  assert.equal(command('ctxFormationCycle').outcome,'accepted');
  assert.equal(selectedDoorStackFormation(s,'FRONT'),'left');
  assert.deepEqual(team(s).map(x=>x.plan.length),before,
   'cycling the visible choice cannot author a plan');
  // Re-select the default for a normal known four-person mission; this
  // is an integration test of the REAL gameplay command, not synthetic
  // route geometry or a copied plan.
  for(let i=0;i<4;i++)command('ctxFormationCycle');
  assert.equal(selectedDoorStackFormation(s,'FRONT'),'auto');
  assert.equal(command('ctxStackTeam').outcome,'accepted');
  const stacked=team(s).map(x=>x.plan.find(n=>n.stackDoorId==='FRONT'));
  assert.equal(stacked.filter(Boolean).length,4);
  for(let i=0;i<stacked.length;i++)for(let j=0;j<i;j++)
   assert.ok(Math.hypot(stacked[i].p.x-stacked[j].p.x,
    stacked[i].p.y-stacked[j].p.y)>22);
 }finally{activateSite(null);}
});
test('M4.9 no door is not a shortcut to a squad plan or preference change',()=>{
 const s=newSession(0,33717,'full-view');
 try{
  const a=team(s)[0];
  const r=dispatchTacticalContextCommand({state:s,selected:a.id,
   actor:a,node:undefined,door:undefined,action:'ctxSquadEntry',
   selectedActiveWatch:false,medicalCandidate:()=>null});
  assert.equal(r.handled,true);
  assert.equal(r.outcome,'rejected');
  assert.deepEqual(team(s).map(x=>x.plan.length),[0,0,0,0]);
 }finally{activateSite(null);}
});

test('M4.9 real context command authors synchronized entry with unchanged AUTO layout',()=>{
 const s=newSession(0,33717,'full-view');
 try{
  const a=team(s)[0],door=s.doors.find(x=>x.id==='FRONT');
  assert.ok(door);
  const result=dispatchTacticalContextCommand({state:s,selected:a.id,
   actor:a,node:undefined,door,action:'ctxSquadEntry',
   selectedActiveWatch:false,medicalCandidate:()=>null});
  assert.equal(result.outcome,'accepted');
  for(const member of team(s)){
   assert.ok(member.plan.some(n=>n.stackDoorId==='FRONT'));
   assert.ok(member.plan.some(n=>n.kind==='sync'));
   assert.ok(member.plan.some(n=>n.entryDoorId==='FRONT'));
  }
 }finally{activateSite(null);}
});
