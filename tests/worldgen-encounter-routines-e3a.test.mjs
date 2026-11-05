import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterRoutines} from '../src/worldgen/encounter-routines.ts';

test('E3-A: work area uses distinct physically connected stations',()=>{
 const site={
  rooms:[{id:'shop',kind:'room',x:0,y:0,w:260,h:235}],
  walls:[],doors:[],
  cover:[
   {x:65,y:63,w:24,h:22,fixture:'desk'},
   {x:159,y:68,w:23,h:25,fixture:'workbench'},
   {x:83,y:180,w:25,h:22,fixture:'packing-station'}
  ]
 };
 const actors=Array.from({length:48},(_,i)=>({
  id:'worker-'+i,role:'occupant',activity:'working',
  readiness:'relaxed',position:{x:110,y:120},heading:0
 }));
 const assigned=assignEncounterRoutines(site,actors,23);
 assert.deepEqual(assigned,assignEncounterRoutines(site,actors,23));
 assert.ok(assigned.some(a=>a.routine?.length>=3));
 for(const actor of assigned.filter(a=>a.routine)){
  assert.ok(actor.routine.length<=4);
  for(const p of actor.routine){
   assert.ok(p.x>20&&p.y>20&&p.x<240&&p.y<215);
   assert.ok(site.cover.every(c=>
    Math.abs(p.x-c.x)>=c.w/2+10||
    Math.abs(p.y-c.y)>=c.h/2+10));
  }
 }
});
test('E3-A: two real door stations may yield three safe patrol stops',()=>{
 const site={rooms:[{id:'shop',kind:'room',x:0,y:0,w:330,h:255}],
  walls:[],cover:[],doors:[
   {a:{x:330,y:75},b:{x:330,y:100}},
   {a:{x:135,y:255},b:{x:160,y:255}}
  ]};
 const actor={id:'patrol',role:'patrol',activity:'patrolling',
  readiness:'attentive',position:{x:155,y:135},heading:0};
 const [out]=assignEncounterRoutines(site,[actor],17);
 assert.ok(out.routine?.length>=2&&out.routine.length<=3);
 assert.deepEqual(out,assignEncounterRoutines(site,[actor],17)[0]);
});
