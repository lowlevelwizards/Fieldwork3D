import test from 'node:test';import assert from 'node:assert/strict';
import {pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {readableMipChain} from '../src/rendering/texture-lod.ts';
import {PixelTextureLibrary,PIXEL_VARIANTS} from '../src/rendering/pixel-materials.ts';
test('manufactured structural seams survive middle mip levels more clearly',()=>{
 const base=pixelPattern('wood');
 const structural=readableMipChain(base,32,'boards');
 const diffuse=readableMipChain(base,32,'none');
 assert.deepEqual(structural.map(x=>x.width),[32,16,8,4,2,1]);
 assert.ok(Math.min(...structural[3].data)<=Math.min(...diffuse[3].data));
 assert.equal(structural.at(-1).data[0],255);
});
test('GPU texture families remain bounded with no frame-time allocations',()=>{
 const cache=new PixelTextureLibrary();
 for(let i=0;i<120;i++)cache.get('wood',i);
 assert.equal(cache.count,PIXEL_VARIANTS);
 assert.ok(cache.estimatedBytes>0&&cache.estimatedBytes<100000);
 cache.dispose();assert.equal(cache.estimatedBytes,0);
});
