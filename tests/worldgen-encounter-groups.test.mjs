import test from 'node:test';
import assert from 'node:assert/strict';
import {composeEncounterGroups} from '../src/worldgen/encounter-groups.ts';
test('seeded group composition produces pairs and never loses occupants',()=>{
 const site={rooms:Array.from({length:6},(_,i)=>({id:'r'+i,kind:'room',x:100*i,y:0,w:100,h:100}))};
 const actors=Array.from({length:9},(_,i)=>({id:'h'+i,
  groupId:'old'+i,role:'sentry',activity:'watching',readiness:'attentive',
  position:{x:100*(i%6)+50,y:50},heading:0}));
 const a=composeEncounterGroups(site,actors,'hideout',99);
 const b=composeEncounterGroups(site,actors,'hideout',99);
 assert.deepEqual(a,b);
 assert.equal(a.actors.length,actors.length);
 assert.equal(a.groups.reduce((sum,g)=>sum+g.members.length,0),actors.length);
 assert.ok(a.groups.some(g=>g.members.length>1));
 assert.ok(a.actors.every(x=>a.groups.some(g=>g.id===x.groupId)));
});
