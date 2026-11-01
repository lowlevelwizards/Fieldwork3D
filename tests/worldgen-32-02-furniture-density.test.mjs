import test from 'node:test';
import assert from 'node:assert/strict';
import {roomSolidFootprint,withinOptionalFurnitureBudget}
 from '../src/worldgen/furniture-density.ts';
import {generateSite} from '../src/breach-site.ts';
const room={id:'D',kind:'room',purpose:'dining',x:0,y:0,w:100,h:100,tone:0};
test('dining rooms allow a sparse table setup and reject optional crowding',()=>{
 const table={x:50,y:50,w:45,h:31,fixture:'dining-table'};
 const chair={x:10,y:10,w:19,h:19,fixture:'chair'};
 const second={...chair,x:20};
 const third={...chair,x:30};
 assert.equal(roomSolidFootprint(room,[table,chair]),1756);
 assert.equal(withinOptionalFurnitureBudget(room,[table,chair,second],361),true);
 assert.equal(withinOptionalFurnitureBudget(room,[table,chair,second,third,{...chair,x:40}],361),false);
});
test('display/architectural framing does not count as usable furnishing',()=>{
 const frame={x:50,y:50,w:90,h:20,fixture:'window-sill'};
 assert.equal(roomSolidFootprint(room,[frame]),0);
});
test('a small restaurant no longer automatically creates fully seated tables',()=>{
 const site=generateSite(7,'small');
 for(const r of site.rooms.filter(r=>r.purpose==='dining')){
  const chairs=site.cover.filter(o=>o.fixture==='chair'&&
   o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h);
  assert.ok(chairs.length<=3,r.id+' has '+chairs.length+' chairs');
 }
});
