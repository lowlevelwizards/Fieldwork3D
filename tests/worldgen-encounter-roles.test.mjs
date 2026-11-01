import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterRoles} from '../src/worldgen/encounter-roles.ts';
test('capture target remains stable and role selection is deterministic',()=>{
 const actors=Array.from({length:9},(_,i)=>({
  id:'h'+i,groupId:'g'+Math.floor(i/3),role:i%3===0?'leader':'occupant',
  position:{x:i*50,y:40},heading:0,activity:'idle',readiness:'attentive'
 }));
 const groups=Array.from({length:3},(_,i)=>({id:'g'+i,
  purpose:i===0?'security':'organised',members:actors.slice(i*3,i*3+3).map(a=>a.id)}));
 const a=assignEncounterRoles({rooms:[]},actors,groups,'hideout','capture',12);
 assert.deepEqual(a,assignEncounterRoles({rooms:[]},actors,groups,'hideout','capture',12));
 assert.equal(a[0].role,'target');
 assert.equal(a.filter(x=>x.role==='target').length,1);
 assert.ok(a.some(x=>x.weaponProfile==='security'));
});
