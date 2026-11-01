import test from 'node:test';import assert from 'node:assert/strict';
import {searchCandidates} from '../src/breach-ai-search.ts';
test('search probes are bounded, reproducible and do not need the hidden target',()=>{
 const rooms=[{id:'hall',x:0,y:0,w:60,h:130,kind:'hall',tone:0},
 {id:'room',x:70,y:0,w:110,h:110,kind:'room',tone:0}];
 const p={x:90,y:50},a=searchCandidates(p,45,rooms);
 assert.deepEqual(a,searchCandidates(p,45,rooms));
 assert.ok(a.length>=2&&a.length<=6);
 assert.ok(a.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));
});
