import test from 'node:test';
import assert from 'node:assert/strict';
import {entryDoorState} from '../src/breach-entry-coordination.ts';
import {doorClear} from '../src/breach-door.ts';
import {newSession,team,planSquadEntry,undoPlan,redoPlan,planWait,stepSession,toggling} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('squad-entry followers wait for physically clear doors, not just elapsed time',()=>{
 const leaf={id:'D',a:{x:100,y:100},b:{x:142,y:100},
  open:false,openFraction:0,openedAt:-1};
 assert.equal(entryDoorState(undefined),'missing');
 assert.equal(entryDoorState(leaf),'pending');
 // A hinge angle is not a reliable measure of actual body passage.
 // Mirror the authoritative geometric clearance predicate rather than
 // relying on an obsolete fixed openFraction=0.72 threshold.
 for(const fraction of [.60,.72,1]){
  const sample={...leaf,open:true,openFraction:fraction};
  assert.equal(entryDoorState(sample),doorClear(sample)?'ready':'pending');
 }
 assert.equal(entryDoorState({...leaf,kind:'shutter',open:true,openFraction:.72}),'ready');
 assert.equal(entryDoorState({...leaf,open:false,openFraction:.90}),'pending');
});

const site={
 seed:31044,name:'EVENT DRIVEN SQUAD ENTRY',layout:'corridor',
 training:true,rooms:[],roomCount:0,cover:[],windows:[],
 walls:[{a:{x:90,y:260},b:{x:290,y:260}},
        {a:{x:332,y:260},b:{x:550,y:260}}],
 doors:[{id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
  open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'}],
 entrance:{x:310,y:260},
 spawn:[{x:300,y:200},{x:308,y:173},{x:316,y:146},{x:325,y:119}],
 enemies:[],objective:{x:520,y:450},extract:{x:520,y:460},
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};

test('entry adds reversible door-bound follower gates without new controls',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const members=team(s),before=members.map(a=>structuredClone(a.plan));
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const followerGates=members.slice(1).map(a=>a.plan.filter(n=>
    n.kind==='wait'&&n.doorId==='ENTRY'));
  assert.ok(followerGates.every(g=>g.length===1));
  assert.ok(followerGates.every(g=>g[0].duration===0),
   'generated gate must release immediately on physical clearance');
  assert.ok(!members[0].plan.some(n=>n.kind==='wait'&&n.doorId));
  assert.equal(undoPlan(s,members[1].id),true);
  assert.deepEqual(members.map(a=>a.plan),before);
  assert.equal(redoPlan(s,members[2].id),true);
  assert.ok(members.slice(1).every(a=>
    a.plan.some(n=>n.kind==='wait'&&n.doorId==='ENTRY')));
 }finally{activateSite(null);}
});

test('B1: an explicit player WAIT retains its normal bounded timing',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const a=team(s)[0];
  assert.equal(planWait(s,a.id,.1),true);
  assert.equal(a.plan.at(-1).duration,.3);
 }finally{activateSite(null);}
});

test('B1: physical gate waits while closed and clears on first ready tick',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const units=team(s);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const follower=units[1];
  const authored=follower.plan.find(n=>
   n.kind==='wait'&&n.doorId==='ENTRY');
  assert.ok(authored&&authored.duration===0);
  // Isolate the synthesized gate from the long stack-approach stage.
  // The door is still the actual session door, checked by swept geometry.
  for(const actor of units){
   actor.plan=[];actor.nav=[];actor.activeNode=-1;
  }
  follower.plan=[{...authored,p:{...follower.p}}];
  toggling(s);
  for(let tick=0;tick<18;tick++)stepSession(s,1/30);
  assert.equal(follower.plan[0]?.id,authored.id,
   'a zero-duration gate must never release through a closed door');
  const door=s.doors.find(d=>d.id==='ENTRY');
  assert.ok(door);
  door.open=true;door.openFraction=1.34;door.pushTarget=1.34;
  door.angularVelocity=0;
  assert.equal(entryDoorState(door),'ready',
   'real operator capsule can traverse the opened fixture');
  stepSession(s,1/30);
  assert.equal(follower.plan.length,0,
   'the first ready fixed tick must consume the generated gate');
 }finally{activateSite(null);}
});

test('B1: complete four-person entry executes all planned orders',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const units=team(s);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const destinations=units.map(a=>a.plan.filter(n=>n.kind==='move').at(-1)?.p);
  toggling(s);
  for(let tick=0;tick<1500;tick++){
   stepSession(s,1/30);
   if(units.every(a=>a.plan.length===0))break;
  }
  assert.ok(units.every((a,i)=>a.plan.length===0&&
   a.p.y>280&&
   Math.hypot(a.p.x-destinations[i].x,a.p.y-destinations[i].y)<18),
   'no follower may stall at a gate: '+
   JSON.stringify(units.map((a,i)=>({
    id:a.id,p:a.p,orders:a.plan.slice(0,3).map(n=>n.kind),
    dest:destinations[i],pause:a.motorPause,blocked:a.blockedTime
   }))));
 }finally{activateSite(null);}
});
