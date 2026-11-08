import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/rendering/miniature-attention-mask.ts',
 import.meta.url),'utf8');
test('attention matte is quarter-res and does not query hidden actor truth',()=>{
 assert.match(src,/ratio=4/);
 assert.match(src,/update\(cssWidth:number,cssHeight:number,dt:number/);
 assert.match(src,/attentionRelease\(old,goal,elapsed\)/);
 assert.doesNotMatch(src,/isSeen\(|liveVisibility\(|s\.operators|enemy\.p/);
});
