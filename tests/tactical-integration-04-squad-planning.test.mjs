import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planSquadEntry,undoPlan,redoPlan,planSync}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const site={
 seed:31044,name:'SQUAD ENTRY TRANSACTION',layout:'corridor',
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
const snapshot=members=>members.map(a=>structuredClone(a.plan));
test('one squad-entry command is all-or-nothing, with squad-level undo and redo',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const members=team(s),before=snapshot(members);
  const ok=planSquadEntry(s,'ENTRY');
  assert.equal(ok,true,'empty fixture should permit coordinated entry');
  const after=snapshot(members);
  assert.ok(after.every((orders,i)=>orders.length>before[i].length));
  assert.equal(s.squadEntryUndo?.members.length,4);
  const syncCodes=members.map(a=>a.plan.find(n=>n.kind==='sync')?.syncCode);
  assert.ok(syncCodes.every(code=>code===syncCodes[0]));
  assert.ok(members.every(a=>a.history.undo.length===1),
    'multiple internal planning calls must collapse to one undo');
  assert.equal(undoPlan(s,members[2].id),true);
  assert.deepEqual(snapshot(members),before,'one selected undo restores all four');
  assert.ok(s.squadEntryRedo);
  assert.equal(redoPlan(s,members[1].id),true);
  assert.equal(JSON.stringify(snapshot(members)),JSON.stringify(after),
    'one selected redo restores equivalent authored entry plans');
 }finally{activateSite(null);}
});

test('failed squad-entry preflight never partially replaces existing plans',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const members=team(s),before=snapshot(members),previous=s.nextId;
  assert.equal(planSquadEntry(s,'NO-SUCH-DOOR'),false);
  assert.deepEqual(snapshot(members),before);
  assert.equal(s.nextId,previous);
  assert.equal(s.squadEntryUndo,null);
 }finally{activateSite(null);}
});

test('surviving operators may synchronize without an incapacitated teammate',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const members=team(s);
  members[3].health=0;
  assert.equal(planSync(s),true);
  assert.ok(members.slice(0,3).every(a=>a.plan.some(n=>n.kind==='sync')));
  assert.ok(!members[3].plan.some(n=>n.kind==='sync'));
 }finally{activateSite(null);}
});
