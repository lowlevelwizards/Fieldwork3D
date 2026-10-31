import test from 'node:test';
import assert from 'node:assert/strict';
import {maskBounds,maskSize,FOG_WIDTH,FOG_HEIGHT} from '../src/breach-fog-mask.ts';
test('fog masks preserve legacy resolution and scale with authoritative world dimensions',()=>{
 assert.deepEqual(maskSize(),{width:FOG_WIDTH,height:FOG_HEIGHT});
 const b={minX:-90,minY:-70,maxX:910,maxY:990};
 assert.deepEqual(maskBounds({bounds:b}),b);
 assert.deepEqual(maskSize({bounds:b}),{width:500,height:530});
});
