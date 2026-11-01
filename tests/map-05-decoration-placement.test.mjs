import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {compatibleDecoration,visibleSurfaceHeight} from '../src/worldgen/decoration-anchors.ts';
test('MAP 05 forbids table lamps on sofas and allows proper supports',()=>{
 assert.equal(compatibleDecoration('lamp','sofa'),false);
 assert.equal(compatibleDecoration('lamp','nightstand'),true);
 assert.equal(compatibleDecoration('mug','dining-table'),true);
 assert.equal(compatibleDecoration('papers','bed'),false);
 assert.equal(visibleSurfaceHeight('coffee-table'),12.5);
});
test('MAP 05 decorative details use actual supports and floor lamps stand aside',()=>{
 let checked=0;
 for(let seed=1;seed<=55;seed++){
  const site=generateSite(seed);
  for(const d of site.dressing??[]){
   if(d.placement==='floor'){
     assert.equal(d.elevation,0);
     if(d.kind==='floor-lamp'){
       assert.ok(site.cover.every(o=>Math.abs(o.x-d.x)>=o.w/2+7||
         Math.abs(o.y-d.y)>=o.h/2+7));
     }else{
       assert.ok(['rug','bedside-rug','bath-mat','welcome-mat','runner'].includes(d.kind));
       assert.ok(d.width>0&&d.depth>0);
     }
   }else if(d.placement==='surface'){
     assert.ok(d.supportFixture);
     assert.ok(compatibleDecoration(d.kind,d.supportFixture));
     assert.equal(d.elevation,visibleSurfaceHeight(d.supportFixture)+.5);
   }
   checked++;
  }
 }
 assert.ok(checked>0);
});
