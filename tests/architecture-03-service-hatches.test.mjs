import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {pointToSegment} from '../src/breach-core.ts';
test('service hatches occupy real partition cuts with collision on the lower wall',()=>{
 let found=0;
 for(let seed=1;seed<=100;seed++){
  const site=generateSite(seed);
  for(const hatch of (site.openings??[]).filter(o=>o.kind==='serving')){
   found++;
   const p={x:(hatch.a.x+hatch.b.x)/2,y:(hatch.a.y+hatch.b.y)/2};
   assert.ok(site.walls.every(w=>pointToSegment(p,w)>1));
   assert.ok(site.cover.some(c=>c.fixture==='window-sill'&&
    Math.hypot(c.x-p.x,c.y-p.y)<1));
  }
 }
 assert.ok(found>0,'service hatch should be emitted by compatible building programs');
});
