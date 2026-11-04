import test from 'node:test';
import assert from 'node:assert/strict';
import {ballisticFurnishingValue,tacticalFurnitureFamily}
 from '../src/worldgen/room-ballistic-furnishing.ts';
import {assessRoomBallisticCover} from '../src/worldgen/room-cover-audit.ts';
const room={id:'shop',kind:'room',purpose:'sales',x:0,y:0,w:160,h:160};
const site={rooms:[room],walls:[],doors:[{
  id:'D',a:{x:0,y:60},b:{x:0,y:100}
 }],openings:[],cover:[]};
test('R7B: furniture family is functional rather than loose decor',()=>{
 assert.equal(tacticalFurnitureFamily('transaction-counter'),true);
 assert.equal(tacticalFurnitureFamily('bookcase'),true);
 assert.equal(tacticalFurnitureFamily('plant'),false);
 assert.equal(tacticalFurnitureFamily('chair'),false);
});
test('R7B: candidate ranking is deterministic and cannot create world geometry',()=>{
 const candidate={x:92,y:80,w:66,h:22,fixture:'bar-counter',low:false};
 const baseline=assessRoomBallisticCover(site,room);
 const score=ballisticFurnishingValue(site,room,candidate,[]);
 const after=assessRoomBallisticCover(site,room,[candidate]);
 assert.ok(Number.isFinite(score)||score===-Infinity);
 assert.ok(after.sampledPositions>=baseline.sampledPositions-3 ||
   score===-Infinity);
 assert.deepEqual(site.cover,[]);
 assert.equal(score,ballisticFurnishingValue(site,room,candidate,[]));
});
test('R7B: simple decor cannot be incentivized into imaginary cover',()=>{
 assert.equal(ballisticFurnishingValue(site,room,{
  x:80,y:80,w:15,h:15,fixture:'plant',low:true},[]),0);
});
