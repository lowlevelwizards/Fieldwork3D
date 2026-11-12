import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_RECIPE_VERSION,pixelPattern,PIXEL_SURFACES}
 from '../src/rendering/pixel-recipes.ts';

const min=(buffer)=>Math.min(...Array.from(buffer).filter((_,i)=>i%4===0));
const changed=(buffer)=>Array.from(buffer).filter((v,i)=>i%4===0&&v<255).length;
test('F3.2 texture families have distinct, restrained and deterministic motifs',()=>{
 assert.ok(MATERIAL_RECIPE_VERSION>=5);
 for(const kind of PIXEL_SURFACES){
  const a=pixelPattern(kind,2,32),b=pixelPattern(kind,2,32);
  assert.deepEqual(a,b,kind);
  assert.equal(a.length,4096,kind);
  assert.equal(a[3],255,kind);
 }
 assert.ok(changed(pixelPattern('concrete'))>changed(pixelPattern('plastic')));
 assert.ok(changed(pixelPattern('woven-fabric'))>changed(pixelPattern('fabric')));
 assert.ok(min(pixelPattern('industrial-steel'))<min(pixelPattern('enamel-metal')));
 assert.ok(min(pixelPattern('rough-wood'))<min(pixelPattern('furniture-wood')));
});
test('F3.2 clean manufactured materials do not acquire universal grain',()=>{
 for(const kind of ['plastic','porcelain','paper']){
  assert.equal(changed(pixelPattern(kind)),0,kind);
 }
 assert.ok(changed(pixelPattern('plaster'))<60);
});
