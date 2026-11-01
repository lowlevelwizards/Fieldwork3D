import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverRoomEssentials} from '../src/worldgen/room-essential-recovery.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';
const input={
 rooms:[
  {id:'k',zoneId:'k',kind:'room',purpose:'kitchen',x:0,y:0,w:58,h:55},
  {id:'b',zoneId:'b',kind:'room',purpose:'bedroom',x:75,y:0,w:190,h:140}],
 doors:[],openings:[],spawn:[],enemies:[],
 objective:{x:-500,y:-500},extract:{x:-500,y:-500}
};
test('bounded essential replan protects impossible rooms and other completed zones',()=>{
 const protectedSill={x:29,y:27,w:43,h:10,fixture:'window-sill',low:true};
 const bed={x:140,y:42,w:56,h:42,fixture:'bed',low:true};
 const cover=[protectedSill,bed];
 const result=recoverRoomEssentials(input,cover);
 assert.ok(result.cover.includes(protectedSill));
 assert.ok(result.cover.includes(bed));
 assert.ok(result.issues.some(i=>i.roomId==='k'&&i.reason==='essential-unresolved'));
 assert.ok(assessRoomContracts({...input,cover:result.cover})
   .some(c=>c.zoneId==='b'&&c.complete));
 assert.deepEqual(recoverRoomEssentials(input,cover),result);
});
test('ample space continues to complete all essentials without duplicate placement',()=>{
 const site={...input,rooms:[{...input.rooms[0],w:240,h:175}],};
 const once=recoverRoomEssentials(site,[]);
 assert.equal(assessRoomContracts({...site,cover:once.cover})[0].complete,true);
 assert.equal(once.issues.length,0);
 const twice=recoverRoomEssentials(site,once.cover);
 assert.deepEqual(twice.cover,once.cover);
});
