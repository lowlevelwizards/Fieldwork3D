import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePoseContactOwners} from '../src/breach-pose-v3-contacts.ts';
const base={surrender:false,down:false,downProgress:0,
 treatmentActive:false,reloadActive:false,reloadProgress:0,
 reloadMode:'emergency',throwActive:false,pushActive:false,
 woundedGuard:false,doorActive:false};
const read=p=>resolvePoseContactOwners({...base,...p});
test('V3: normal hold owns both grips',()=>{
 assert.deepEqual(read({}),{action:'hold',left:'weapon',right:'weapon',phase:null});
});
test('V3: reload phases release only support hand',()=>{
 for(const [progress,left,phase] of [
  [.1,'free','reach'],[.35,'magazine','remove'],
  [.51,'magazine','retrieve'],[.75,'magazine','insert'],
  [.93,'free','settle']]){
  const r=read({reloadActive:true,reloadProgress:progress});
  assert.equal(r.left,left);assert.equal(r.phase,phase);
  assert.equal(r.right,'weapon');
 }
 assert.equal(read({reloadActive:true,reloadProgress:.5,
  reloadMode:'shells'}).left,'ammunition');
});
test('V3: collapse and action precedence retain established priority',()=>{
 assert.deepEqual([read({down:true,downProgress:.1}).left,
  read({down:true,downProgress:.2}).left,
  read({down:true,downProgress:.6}).right],
  ['weapon','free','free']);
 for(const [flags,action] of [
  [{surrender:true,reloadActive:true},'surrender'],
  [{down:true,treatmentActive:true},'down'],
  [{treatmentActive:true,reloadActive:true},'treatment'],
  [{reloadActive:true,throwActive:true},'reload'],
  [{throwActive:true,doorActive:true},'throw'],
  [{pushActive:true,doorActive:true},'push'],
  [{woundedGuard:true,doorActive:true},'injury'],
  [{doorActive:true},'door']]){
  assert.equal(read(flags).action,action);
 }
});
