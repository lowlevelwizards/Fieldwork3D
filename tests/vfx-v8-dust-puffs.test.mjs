import test from 'node:test';
import assert from 'node:assert/strict';
import {DustPuffBatch,PUFF_LIMIT,puffCount,samplePuff} from '../src/rendering/breach-dust-puffs.ts';
import {PUFF_LIFE} from '../src/breach-atmosphere-evidence.ts';
const scratch=()=>({x:0,y:0,z:0,size:0,alpha:0,color:0,phase:0});
test('V8 deterministic expanding dust and flash puffs expire from recorded age',()=>{
 for(const kind of ['dust','wood','stone','flash','muzzle','collapse']){
  const a=scratch(),b=scratch();
  assert.ok(samplePuff(kind,7,0,.1,12,3,17,a));
  assert.ok(samplePuff(kind,7,0,.2,12,3,17,b));
  assert.ok(b.size>a.size&&b.alpha<a.alpha);
  assert.ok(samplePuff(kind,7,0,.1,12,3,17,b));assert.deepEqual(a,b);
  assert.equal(samplePuff(kind,7,0,PUFF_LIFE[kind],12,3,17,b),false);
  assert.equal(samplePuff(kind,7,puffCount(kind),.1,12,3,17,b),false);
 }
});
test('V8 one fixed shadowless billboard batch, overflow and empty rewind',()=>{
 const b=new DustPuffBatch(),p=scratch();
 samplePuff('dust',1,0,.1,3,4,5,p);
 b.begin();for(let i=0;i<100;i++)b.add(p);b.finish();
 assert.equal(b.mesh.count,PUFF_LIMIT);assert.equal(b.mesh.castShadow,false);
 assert.equal(b.mesh.material.depthWrite,false);assert.match(b.mesh.material.vertexShader,/modelViewMatrix\*instanceMatrix/);
 b.begin();b.finish();assert.equal(b.mesh.count,0);
 b.add(p);b.finish();b.reset();assert.equal(b.mesh.count,0);b.dispose();
});

test('V10 paused puffs skip uploads but rewind and compaction rewrite',()=>{
 const b=new DustPuffBatch(),p=scratch();
 samplePuff('dust',1,0,.1,3,4,5,p);
 const frame=()=>{b.begin();b.add(p);b.finish();return b.mesh.instanceMatrix.version;};
 const first=frame();assert.equal(frame(),first);
 samplePuff('dust',1,0,.2,3,4,5,p);assert.equal(frame(),first+1);
 b.begin();b.finish();assert.equal(b.mesh.count,0);
 samplePuff('dust',1,0,.1,3,4,5,p);assert.equal(frame(),first+2);
 b.reset();assert.equal(frame(),first+3);b.dispose();
});
