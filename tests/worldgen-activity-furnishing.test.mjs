import test from 'node:test';
import assert from 'node:assert/strict';
import {furnishRooms} from '../src/worldgen/room-furnishing.ts';
import {relatedFurniturePositions} from '../src/worldgen/room-composition.ts';

function roomSite(purpose,w=230,h=200){
 return {seed:17,rooms:[{id:'r',x:0,y:0,w,h,kind:'room',purpose,tone:0}],
  cover:[],doors:[],openings:[],spawn:[],enemies:[],
  objective:{x:-100,y:-100},extract:{x:-100,y:-100}};
}
test('large dining rooms have a table and multiple separate chairs',()=>{
 const site=furnishRooms(roomSite('dining'),17);
 assert.ok(site.cover.some(o=>o.fixture==='dining-table'));
 assert.ok(site.cover.filter(o=>o.fixture==='chair').length>=2);
});
test('waiting rooms and workrooms support complete usable activity stations',()=>{
 const waiting=furnishRooms(roomSite('waiting'),18);
 assert.ok(waiting.cover.filter(o=>o.fixture==='chair').length>=2);
 const office=furnishRooms(roomSite('office'),18);
 assert.ok(office.cover.some(o=>o.fixture==='desk'));
 assert.ok(office.cover.some(o=>o.fixture==='office-chair'));
});
test('table arrangements can offer seating on all four accessible sides',()=>{
 const room={x:0,y:0,w:240,h:230};
 const placed=[{fixture:'dining-table',x:120,y:110,w:45,h:31}];
 const candidates=relatedFurniturePositions(room,'chair',19,19,placed);
 assert.equal(candidates.length,4);
});
