import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {windowPaneSegment,initializeWindows} from '../src/breach-windows.ts';
import {pointToSegment} from '../src/breach-core.ts';
test('interior glazing cuts a partition, retains a physical sill and uses existing window simulation',()=>{
 let found=0;
 for(let seed=1;seed<=110;seed++){
  const s=generateSite(seed);
  const glass=(s.windows??[]).filter(w=>w.interior);
  for(const w of glass){
   found++;
   const p={x:w.x,y:w.y};
   assert.ok(s.cover.some(c=>c.fixture===(w.sillHeight===0?'glass-barrier':'window-sill')&&
    Math.hypot(c.x-p.x,c.y-p.y)<.001));
   assert.ok(s.walls.every(wall=>pointToSegment(p,wall)>2));
   const state=initializeWindows([w])[0];
   assert.equal(state.operable,false);
   assert.equal(state.shattered,false);
   const segment=windowPaneSegment(state);
   assert.ok(Math.hypot(segment.b.x-segment.a.x,segment.b.y-segment.a.y)>30);
  }
 }
 assert.ok(found>=3,'at least three sites should expose real interior glazed partitions');
});
