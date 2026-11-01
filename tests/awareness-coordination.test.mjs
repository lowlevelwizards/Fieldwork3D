import test from 'node:test';import assert from 'node:assert/strict';
import {groupResponse} from '../src/breach-ai-coordination.ts';
test('one nearby listener investigates while others cover',()=>{
 const allies=[{id:'B',p:{x:70,y:0}},{id:'C',p:{x:20,y:0}},
 {id:'D',p:{x:100,y:0}}];
 const roles=groupResponse(allies,{x:0,y:0});
 assert.equal(roles.C,'investigate');
 assert.equal(roles.B,'watch');
 assert.equal(roles.D,'watch');
 assert.deepEqual(roles,groupResponse([...allies].reverse(),{x:0,y:0}));
});
