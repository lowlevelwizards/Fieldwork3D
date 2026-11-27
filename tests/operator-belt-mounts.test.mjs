import test from 'node:test';
import assert from 'node:assert/strict';
import {beltContactSegments,beltSurface} from '../src/operator-belt-frame.ts';
import {resolveBeltMounts} from '../src/operator-belt-mounts.ts';
const footprint={width:2,height:3,depth:1,spaces:1};
test('BT2: normals and sockets share the authored outer contact band',()=>{
 const segments=beltContactSegments();
 for(const s of segments){
  assert.ok(s.x*s.normalX+s.z*s.normalZ>0);
  const a=beltSurface('plain-belt',s.index),b=beltSurface('padded-belt',s.index);
  assert.ok((b.x-a.x)*s.normalX+(b.z-a.z)*s.normalZ>0);
 }
 assert.equal(beltSurface('no-belt',0),null);
});
test('BT2: stable fitting, occupied mounts cannot overlap, requests are not mutated',()=>{
 const requests=[{id:'a',footprint,preferred:'right-hip',allowed:['right-hip']},
  {id:'b',footprint,preferred:'right-hip',allowed:['right-hip']},
  {id:'c',footprint,preferred:'left-hip',allowed:['left-hip']}];
 const before=JSON.stringify(requests),r=resolveBeltMounts('battle-belt',requests);
 assert.equal(r.mounts.length,2);assert.equal(r.rejected[0].reason,'no-fit');
 assert.equal(r.used,2);assert.deepEqual(r,resolveBeltMounts('battle-belt',requests));
 assert.equal(JSON.stringify(requests),before);
});
test('BT2: capacity, duplicate, no belt, invalid and excessive footprints fail explicitly',()=>{
 const a={id:'a',footprint};
 assert.equal(resolveBeltMounts('no-belt',[a]).rejected[0].reason,'no-belt');
 assert.equal(resolveBeltMounts('plain-belt',[a,{...a,id:'b'}]).rejected[0].reason,'capacity');
 assert.equal(resolveBeltMounts('duty-belt',[a,a]).rejected[0].reason,'duplicate');
 assert.equal(resolveBeltMounts('battle-belt',[{id:'x',footprint:{...footprint,width:NaN}}]).rejected[0].reason,'invalid-footprint');
 assert.equal(resolveBeltMounts('battle-belt',[{id:'x',footprint:{...footprint,height:9}}]).rejected[0].reason,'no-fit');
});
