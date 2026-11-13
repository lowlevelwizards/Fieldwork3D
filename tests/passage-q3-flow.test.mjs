import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
import {activateSite} from '../src/breach-core.ts';
test('Q3 live continuous four-person crossing has no generated timer dwell',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('inward-left'),{enableCivilians:false});
 try{
  const actors=team(s).slice(0,4);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  for(const a of actors){
   for(const n of a.plan)if(n.kind==='wait'&&n.doorId==='ENTRY')
    assert.equal(n.duration,0,'door clearance is physical, not timed per man');
  }
  const crossings=new Map();
  toggling(s);
  let physical=true;
  for(let i=0;i<1800;i++){
   stepSession(s,1/60);
   for(const a of actors){
    if(!Number.isFinite(a.p.x+a.p.y))physical=false;
    if(a.p.y>278&&!crossings.has(a.id))crossings.set(a.id,s.seconds);
   }
   if(actors.every(a=>!a.plan.length))break;
  }
  assert.ok(physical);
  assert.equal(crossings.size,4,'all four must physically clear');
  assert.ok(actors.every(a=>!a.plan.length),'all four complete authored entry');
  const times=[...crossings.values()].sort((a,b)=>a-b);
  assert.ok(times.every(Number.isFinite));
  assert.ok(times.at(-1)-times[0]<15,'door must not serialize with a permanent wait');
 }finally{activateSite(null);}
});
