import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,planSquadEntry} from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
test('Q6 pre-opened hinge retains an opener before followers are released',()=>{
 for(const entry of ['ajar-outward','wide-open']){
  const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(entry),{enableCivilians:false});
  try{
   prepareDoorRangeCase(s,entry);
   const initial=s.doors[0].openFraction;
   assert.equal(planSquadEntry(s,'ENTRY'),true,entry);
   assert.equal(team(s)[0].plan.some(n=>n.kind==='door'&&
    n.method==='open'),true,entry+' keeps a deliberate opener');
   assert.equal(s.doors[0].openFraction,initial,
    'planning never moves a real hinge');
   assert.equal(team(s).slice(1).every(a=>
    a.plan.some(n=>n.kind==='wait'&&n.doorId==='ENTRY')),true);
  }finally{activateSite(null);}
 }
});
test('Q6 closed hinge still gets the lead OPEN before followers enter',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('inward-left'),{enableCivilians:false});
 try{
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const a=team(s)[0];
  assert.equal(a.plan.some(n=>n.kind==='door'&&n.method==='open'),true);
 }finally{activateSite(null);}
});
