import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {coverHeight} from '../src/breach-cover-height.ts';
test('generated room fixtures use semantic cover classes and height',()=>{
 for(let seed=1;seed<=60;seed++){
  const site=generateSite(seed);
  for(const o of site.cover){
   const room=site.rooms.find(r=>o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h);
   if(!room||!o.fixture)continue;
   const a=propDefinition(o.fixture);if(!a)continue;
   assert.equal(o.low,a.cover==='low',o.fixture);
   assert.equal(coverHeight(o),a.height);
  }
 }
});
