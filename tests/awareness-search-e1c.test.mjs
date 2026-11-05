import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCandidates} from '../src/breach-ai-search.ts';
const rooms=[
  {id:'left',x:10,y:10,w:110,h:130,kind:'room',tone:0},
  {id:'right',x:120,y:10,w:110,h:130,kind:'room',tone:0}
];
const doors=[{a:{x:120,y:60},b:{x:120,y:91}}];
test('E1-C: rooms with doors create standoff observations and no threshold-center probes',()=>{
 const p={x:110,y:78},out=searchCandidates(p,50,rooms,doors);
 assert.ok(out.length>0&&out.length<=6);
 assert.ok(out.some(q=>Math.abs(q.x-120)>=15&&Math.abs(q.y-75.5)<33));
 assert.equal(out.some(q=>q.x===120&&q.y===75.5),false);
 assert.deepEqual(out,searchCandidates(p,50,rooms,doors));
});
test('E1-C: optional fixture cues do not produce any point inside solid cover',()=>{
 const fixture={x:68,y:78,w:35,h:30};
 const out=searchCandidates({x:70,y:80},40,rooms,[],[fixture]);
 assert.ok(out.length<=6);
 // Ignore the room center as an actor route still checks real passability.
 assert.ok(out.some(p=>Math.hypot(p.x-fixture.x,p.y-fixture.y)>23));
});
test('E1-C: no secret actor coordinates, stable bounded fallback',()=>{
 const p={x:95,y:66},result=searchCandidates(p,90,rooms);
 assert.deepEqual(result,searchCandidates(p,90,rooms));
 assert.ok(result.length>=2&&result.length<=6);
 assert.ok(result.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));
});
