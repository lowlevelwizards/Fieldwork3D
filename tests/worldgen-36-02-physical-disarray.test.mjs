import test from 'node:test';
import assert from 'node:assert/strict';
import {addScenarioDisarray} from '../src/worldgen/scenario-disarray.ts';
const rooms=Array.from({length:7},(_,i)=>({id:'R'+i,
 kind:'room',purpose:i%2===0?'office':'storage',
 x:i*220,y:0,w:180,h:180,tone:0}));
const site={seed:8,scenarioStyle:'disrupted',rooms,doors:[],windows:[],
 walls:[],cover:[],spawn:[],enemies:[],objective:{x:5000,y:5000},
 extract:{x:5100,y:5000},entrance:{x:-400,y:0}};
test('disrupted room debris uses real small physical props in safe corner envelopes',()=>{
 const s=addScenarioDisarray(site,8);
 assert.ok(s.cover.length<=3);
 assert.ok(s.cover.every(o=>['tipped-trash-bin','storage-tote'].includes(o.fixture)));
 assert.ok(s.cover.every(o=>o.low));
 assert.deepEqual(s.cover,addScenarioDisarray(site,8).cover);
 assert.deepEqual(site.cover,[],'input site remains pristine');
});
test('no physical scatter or fake cover on routine or guarded missions',()=>{
 for(const style of ['routine','guarded']){
  const s=addScenarioDisarray({...site,scenarioStyle:style},8);
  assert.equal(s.cover.length,0);
 }
});
test('a room too small for a deliberate corner placement gets no debris',()=>{
 const s=addScenarioDisarray({...site,rooms:[
  {...rooms[0],w:95,h:94}]},8);
 assert.deepEqual(s.cover,[]);
});
