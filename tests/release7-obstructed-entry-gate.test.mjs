import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planSquadEntry,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {doorSwingBlocked,doorClear} from '../src/breach-door.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';

const p=(x,y)=>({x,y});
const site={
 seed:31045,name:'R7 blocked entry warning regression',training:true,
 layout:'corridor',rooms:[],roomCount:0,
 walls:[{a:p(90,260),b:p(290,260)},{a:p(332,260),b:p(550,260)}],
 doors:[{id:'ENTRY',a:p(290,260),b:p(332,260),
  kind:'hinged',hinge:'a',swing:-1,open:false,openedAt:-1}],
 cover:[{x:322,y:295,w:18,h:22}],windows:[],
 entrance:p(311,260),
 spawn:[p(300,200),p(308,173),p(316,146),p(325,119)],
 enemies:[],objective:p(520,450),extract:p(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};

test('R7 blocked swing: warn from the same scoped geometry that stops the hinge',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  toggling(s);
  for(let i=0;i<600;i++)stepSession(s,1/30);
  const door=s.doors.find(x=>x.id==='ENTRY');
  assert.ok(door);
  assert.ok(door.openFraction>.12&&door.openFraction<.72,
   'real furniture must halt the leaf, not pass through it');
  assert.equal(doorClear(door),false);
  const blocked=doorSwingBlocked(door,
   Math.min(1,door.openFraction+.07),[],undefined,sessionWorldGeometry(s));
  assert.equal(blocked,true,'same world used by authoritative door motor');
  assert.ok(s.events.some(e=>e.includes('DOOR SWING OBSTRUCTED')),
   'follower should receive actionable obstruction warning');
  assert.ok(team(s).every(a=>a.p.y<276),
   'blocked leaf must never permit a threshold crossing');
 }finally{activateSite(null);}
});
