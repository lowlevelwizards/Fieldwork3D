import test from 'node:test';
import assert from 'node:assert/strict';
import {addScenarioFortifications} from '../src/worldgen/scenario-fortifications.ts';
const rooms=Array.from({length:7},(_,i)=>({
 id:'R'+i,x:i*225,y:0,w:200,h:175,kind:'room',
 purpose:i%2?'storage':'sales',tone:0}));
const site={archetype:'retail',scenarioStyle:'guarded',rooms,
 doors:[],openings:[],windows:[],walls:[],cover:[],
 seed:1,spawn:[],enemies:[],objective:{x:3000,y:3100},
 extract:{x:3200,y:3100},entrance:{x:-500,y:0}};
test('guarded scenes use at most two safe physical barricade elements',()=>{
 const a=addScenarioFortifications(site,1);
 assert.ok(a.cover.length<=2);
 assert.ok(a.cover.every(o=>['crate','small-table','pallet'].includes(o.fixture)));
 assert.deepEqual(a,addScenarioFortifications(site,1));
 assert.deepEqual(site.cover,[],'input remains immutable');
});
test('no fortifications in routine or disrupted layouts',()=>{
 for(const style of ['routine','disrupted']){
  const s=addScenarioFortifications({...site,scenarioStyle:style},1);
  assert.deepEqual(s.cover,[]);
 }
});
test('fortifications cannot block doors or actor objective envelopes',()=>{
 const room=rooms[0];
 const nearby={...site,rooms:[room],doors:[
  {id:'D',a:{x:room.x+room.w*.27-24,y:47},
   b:{x:room.x+room.w*.27+24,y:47},open:false}
 ],spawn:[{x:room.x+room.w*.73,y:room.y+room.h*.73}],
 enemies:[{x:room.x+room.w*.73,y:room.y+room.h*.27}],
 objective:{x:room.x+room.w*.27,y:room.y+room.h*.73}};
 const result=addScenarioFortifications(nearby,1);
 for(const o of result.cover){
  const p={x:o.x,y:o.y};
  for(const q of [...nearby.spawn,...nearby.enemies,nearby.objective])
   assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>Math.max(o.w,o.h)/2+54);
 }
});
