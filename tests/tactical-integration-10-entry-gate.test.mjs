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
 assert.equal(entryDoorState({...leaf,open:true,openFraction:1}),'ready');
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

test('B1: generated gate is consumed on the first ready execution tick',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const units=team(s);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const gates=units.slice(1).map(a=>
   a.plan.find(n=>n.kind==='wait'&&n.doorId==='ENTRY')?.id);
  assert.ok(gates.every(id=>Number.isInteger(id)));
  const readyAt=new Array(3).fill(null),releasedAt=new Array(3).fill(null);
  toggling(s);
  for(let tick=0;tick<1500;tick++){
   const clear=entryDoorState(s.doors.find(d=>d.id==='ENTRY'))==='ready';
   units.slice(1).forEach((a,i)=>{
    if(clear&&a.plan[0]?.id===gates[i]&&readyAt[i]===null)
      readyAt[i]=s.seconds;
   });
   stepSession(s,1/30);
   units.slice(1).forEach((a,i)=>{
    if(readyAt[i]!==null&&releasedAt[i]===null&&
       a.plan[0]?.id!==gates[i])releasedAt[i]=s.seconds;
   });
   if(releasedAt.every(t=>t!==null))break;
  }
  const report={
   door:s.doors.map(d=>({id:d.id,open:d.open,fraction:d.openFraction,
    clear:entryDoorState(d)})),
   actors:units.map(a=>({id:a.id,p:a.p,pause:a.motorPause,
    blocked:a.lastBlocker,blockedSeconds:a.blockedTime,ready:a.syncReady,
    orders:a.plan.slice(0,5).map(n=>({id:n.id,kind:n.kind,door:n.doorId,
     duration:n.duration})),nav:a.nav.length})),
   readyAt,releasedAt,seconds:s.seconds
  };
  assert.ok(readyAt.every(t=>t!==null),
   'all followers must actually reach a ready physical door gate: '+
   JSON.stringify(report));
  for(let i=0;i<3;i++)assert.ok(
   releasedAt[i]!==null&&releasedAt[i]-readyAt[i]<.09,
   'no extra timer after door clearance: '+JSON.stringify({readyAt,releasedAt}));
 }finally{activateSite(null);}
});
