import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverRoomEssentials} from '../src/worldgen/room-essential-recovery.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';

const site=(purpose)=>({
 rooms:[{id:'R',zoneId:'R',kind:'room',purpose,x:0,y:0,w:92,h:70}],
 doors:[],openings:[],spawn:[],enemies:[],
 objective:{x:-500,y:-500},extract:{x:-500,y:-500}
});
test('reclaims optional decor when an essential bed otherwise cannot fit',()=>{
 const input=site('bedroom');
 const dresser={x:46,y:35,w:32,h:19,fixture:'dresser',low:false};
 const fixed=recoverRoomEssentials(input,[dresser]);
 assert.equal(fixed.recovered,1);
 assert.ok(fixed.cover.some(o=>o.fixture==='bed'));
 assert.ok(!fixed.cover.some(o=>o.fixture==='dresser'));
 assert.equal(assessRoomContracts({...input,cover:fixed.cover})[0].complete,true);
 assert.deepEqual(fixed,recoverRoomEssentials(input,[dresser]));
});
test('never displaces real window or architectural barriers to force decor',()=>{
 const input=site('bedroom');
 const sill={x:46,y:35,w:70,h:38,fixture:'window-sill',low:true};
 const fixed=recoverRoomEssentials(input,[sill]);
 assert.ok(fixed.cover.includes(sill));
 assert.ok(fixed.issues.some(i=>i.reason==='essential-unresolved'));
});
test('already-satisfied required groups survive reclaim, with no duplicate required objects',()=>{
 const input=site('bedroom');
 const bed={x:46,y:35,w:50,h:39,fixture:'bed',low:true};
 const fixed=recoverRoomEssentials(input,[bed]);
 assert.deepEqual(fixed.cover,[bed]);
 assert.equal(fixed.recovered,0);
});
