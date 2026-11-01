import test from 'node:test';
import assert from 'node:assert/strict';
import {readableMipChain} from '../src/rendering/texture-lod.ts';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
test('deliberate mips end in neutral base without changing source pixels',()=>{
 for(const kind of ['wood','tile','brick','grass','metal']){
  const source=pixelPattern(kind,3),original=source.slice();
  const mips=readableMipChain(source,32);
  assert.deepEqual(source,original);
  assert.deepEqual(mips.map(x=>x.width),[32,16,8,4,2,1]);
  assert.equal(mips[0].data,source);
  assert.ok(mips.slice(1).every(x=>x.data.length===x.width*x.height*4));
  assert.equal(mips.at(-1).data[0],255);
 }
});
