import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterRoutines} from '../src/worldgen/encounter-routines.ts';
test('routines are reproducible, local and limited to relaxed actors',()=>{
 const site={rooms:[{id:'r',kind:'room',x:0,y:0,w:220,h:220}],
  walls:[],cover:[],doors:[]};
 const actors=Array.from({length:20},(_,i)=>({
  id:'h'+i,role:'occupant',activity:'working',readiness:'relaxed',
  position:{x:100,y:100},heading:0
 }));
 const a=assignEncounterRoutines(site,actors,23);
 assert.deepEqual(a,assignEncounterRoutines(site,actors,23));
 assert.ok(a.some(x=>x.routine?.length===2));
 assert.ok(a.some(x=>!x.routine));
 assert.ok(a.every(x=>!x.routine||x.routine.every(p=>p.x>20&&p.y>20)));
 const guarded=assignEncounterRoutines(site,[{...actors[0],readiness:'prepared'}],23);
 assert.ok(!guarded[0].routine);
});

test('G4: a working occupant can actually visit a second furnished station',()=>{
 const site={rooms:[{id:'work',kind:'room',x:0,y:0,w:250,h:190}],
  walls:[],doors:[],cover:[
    {x:55,y:75,w:20,h:20,fixture:'desk'},
    {x:140,y:42,w:20,h:20,fixture:'workbench'}
  ]};
 const workers=Array.from({length:24},(_,i)=>({
  id:'worker-'+i,role:'occupant',activity:'working',
  readiness:'relaxed',position:{x:55,y:40},heading:0
 }));
 const assigned=assignEncounterRoutines(site,workers,23);
 assert.deepEqual(assigned,assignEncounterRoutines(site,workers,23));
 assert.ok(assigned.some(a=>a.routine?.[1]?.x>98),
  'real second workbench creates a reachable furniture-aware route');
 for(const actor of assigned.filter(a=>a.routine)){
  const p=actor.routine[1];
  assert.ok(p.x>20&&p.y>20&&p.x<230&&p.y<170);
  assert.ok(site.cover.every(c=>Math.abs(p.x-c.x)>=c.w/2+10||
    Math.abs(p.y-c.y)>=c.h/2+10));
 }
});
