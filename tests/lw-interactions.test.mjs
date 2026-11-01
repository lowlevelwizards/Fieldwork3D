import test from 'node:test';import assert from 'node:assert/strict';
import {doorInteraction,worldObjectId} from '../src/breach-interactions.ts';
const d={id:'FRONT',a:{x:0,y:0},b:{x:48,y:0},open:false,openedAt:-1};
const query=(door,action,actorId='rook',p={x:24,y:14})=>
 doorInteraction({target:door,action,actorId,actorPosition:p});
test('same physical door capabilities for all actors',()=>{
 assert.equal(query(d,'open').allowed,true);
 assert.equal(query(d,'close').reason,'already-closed');
 assert.equal(query(d,'kick').allowed,true);
 assert.equal(query({...d,kind:'shutter'},'kick').reason,'unsupported');
 assert.equal(query({...d,heldBy:'guard'},'open').reason,'held');
 assert.equal(query(d,'open','guard',{x:300,y:300}).reason,'out-of-reach');
 assert.equal(worldObjectId('door','FRONT'),'door:FRONT');
});
