import test from 'node:test';
import assert from 'node:assert/strict';
import {entryDoorState} from '../src/breach-entry-coordination.ts';
import {newSession,team,planSquadEntry,undoPlan,redoPlan} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('squad-entry followers wait for physically clear doors, not just elapsed time',()=>{
 const leaf={id:'D',a:{x:100,y:100},b:{x:142,y:100},
  open:false,openFraction:0,openedAt:-1};
 assert.equal(entryDoorState(undefined),'missing');
 assert.equal(entryDoorState(leaf),'pending');
 assert.equal(entryDoorState({...leaf,open:true,openFraction:.60}),'pending');
 assert.equal(entryDoorState({...leaf,open:true,openFraction:.72}),'ready');
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
  assert.ok(followerGates.every(g=>g[0].duration===.3));
  assert.ok(!members[0].plan.some(n=>n.kind==='wait'&&n.doorId));
  assert.equal(undoPlan(s,members[1].id),true);
  assert.deepEqual(members.map(a=>a.plan),before);
  assert.equal(redoPlan(s,members[2].id),true);
  assert.ok(members.slice(1).every(a=>
    a.plan.some(n=>n.kind==='wait'&&n.doorId==='ENTRY')));
 }finally{activateSite(null);}
});
