import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceDetailBudget} from '../src/worldgen/environment-composition.ts';
import {dressSite} from '../src/worldgen/environment-dresser.ts';
const makeRoom=(purpose,w,h)=>({id:'R',purpose,kind:'room',x:0,y:0,w,h,tone:0});
test('empty space remains deliberate in compact residential and public rooms',()=>{
 const tiny=makeRoom('waiting',75,70),large=makeRoom('waiting',210,195);
 assert.ok(surfaceDetailBudget(tiny,'busy')<=1);
 assert.ok(surfaceDetailBudget(large,'busy')>=surfaceDetailBudget(tiny,'busy'));
 assert.ok(surfaceDetailBudget(large,'busy')<6);
});
test('storage may collect more visual detail than a public waiting room',()=>{
 const waiting=makeRoom('waiting',170,135);
 const store=makeRoom('stockroom',170,135);
 assert.ok(surfaceDetailBudget(store,'occupied')>surfaceDetailBudget(waiting,'occupied'));
 assert.ok(surfaceDetailBudget(waiting,'vacant')<
  surfaceDetailBudget(waiting,'busy'));
});
test('surface clutter remains nonphysical, bounded and deterministic',()=>{
 const room=makeRoom('office',190,160);
 const cover=Array.from({length:12},(_,i)=>({
  x:20+(i%4)*39,y:25+Math.floor(i/4)*40,
  w:25,h:24,fixture:i%2?'desk':'counter'
 }));
 const site={rooms:[room],cover,doors:[],seed:6,
  identity:{condition:'busy'}};
 const a=dressSite(site,6),b=dressSite(site,6);
 assert.deepEqual(a.dressing,b.dressing);
 assert.deepEqual(a.cover,cover);
 assert.ok(a.dressing.filter(x=>x.placement==='surface').length<=
  surfaceDetailBudget(room,'busy'));
});
