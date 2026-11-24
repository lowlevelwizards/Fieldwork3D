import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGrassCrossCard,GRASS_VARIANTS} from '../src/rendering/perplung-grass-atom.ts';
test('V2 Perplung tuft preserves two crossed cards and padded atlas regions',()=>{
 for(let v=0;v<GRASS_VARIANTS;v++){
  const g=makeGrassCrossCard(v),pos=g.attributes.position,uv=g.attributes.uv;
  assert.equal(pos.count,8);assert.equal(g.index.count,12);
  assert.equal(g.boundingBox.min.y,0);assert.equal(g.boundingBox.max.y,1);
  for(let i=0;i<uv.count;i++){
   assert.ok(uv.getX(i)>v/4&&uv.getX(i)<(v+1)/4);
   assert.ok(uv.getY(i)>0&&uv.getY(i)<1);
  }
  g.dispose();
 }
 assert.throws(()=>makeGrassCrossCard(4),RangeError);
});
