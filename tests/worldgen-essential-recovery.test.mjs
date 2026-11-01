import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverRoomEssentials} from '../src/worldgen/room-essential-recovery.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';
const site=(purpose,w=210,h=150)=>({rooms:[{id:'r1',kind:'room',purpose,zoneId:'z',x:0,y:0,w,h}],
  doors:[],openings:[],spawn:[],enemies:[],objective:{x:-500,y:-500},extract:{x:-500,y:-500}});
test('recovers all mandatory kitchen equipment without manufacturing duplicate assets',()=>{
 const input=site('kitchen');
 const first=recoverRoomEssentials(input,[]);
 assert.equal(assessRoomContracts({...input,cover:first.cover})[0].complete,true);
 assert.equal(first.issues.length,0);
 assert.deepEqual(recoverRoomEssentials(input,first.cover).cover,first.cover);
 const again=recoverRoomEssentials(input,[]);
 assert.deepEqual(first,again);
});
test('small impossible rooms transparently report unmet essentials',()=>{
 const input=site('kitchen',58,55);
 const result=recoverRoomEssentials(input,[]);
 assert.ok(result.issues.some(x=>x.reason==='essential-unresolved'));
 assert.equal(assessRoomContracts({...input,cover:result.cover})[0].complete,false);
});
test('required objects may recover into a second connected rectangle',()=>{
 const input={...site('bathroom',70,100),rooms:[
  {id:'r1',kind:'room',purpose:'bathroom',zoneId:'unit',x:0,y:0,w:32,h:100},
  {id:'r2',kind:'room',purpose:'bathroom',zoneId:'unit',x:32,y:0,w:95,h:100}]};
 const result=recoverRoomEssentials(input,[]);
 assert.ok(result.cover.some(o=>o.x>32));
 assert.equal(assessRoomContracts({...input,cover:result.cover})[0].complete,true);
});
