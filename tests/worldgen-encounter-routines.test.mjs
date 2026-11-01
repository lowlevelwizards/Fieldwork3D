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
