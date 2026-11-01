import test from 'node:test';
import assert from 'node:assert/strict';
import {furnishRooms} from '../src/worldgen/room-furnishing.ts';
import {generateSite} from '../src/breach-site.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';

function emptyRoom(purpose,w=160,h=150){
 return {seed:1,rooms:[{id:'a',x:0,y:0,w,h,kind:'room',purpose,tone:0}],
  cover:[],doors:[],openings:[],spawn:[],enemies:[],objective:{x:-99,y:-99},
  extract:{x:-99,y:-99}};
}
test('bathroom essential fixtures are attempted even in compact furnishing mode',()=>{
 const site=furnishRooms(emptyRoom('bathroom',105,110),5);
 assert.ok(site.cover.some(o=>o.fixture==='toilet'));
 assert.ok(site.cover.length>1,'compact rooms must not arbitrarily truncate to one fixture');
 assert.ok(Array.isArray(site.furnishingIssues));
 for(const o of site.cover){
  assert.ok(o.x-o.w/2>=0&&o.x+o.w/2<=105);
  assert.ok(o.y-o.h/2>=0&&o.y+o.h/2<=110);
 }
});
test('larger functional kitchens attempt all essential activity fixtures',()=>{
 const site=furnishRooms(emptyRoom('kitchen',210,160),8);
 const report=assessRoomContracts(site)[0];
 assert.equal(report.complete,true,JSON.stringify(report.missing));
});
test('live room furnishing remains deterministic across representative site seeds',()=>{
 for(let seed=1;seed<=12;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.cover,b.cover,'seed '+seed);
  assert.deepEqual(a.furnishingIssues,b.furnishingIssues,'seed '+seed);
 }
});
