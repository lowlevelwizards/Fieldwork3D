import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {initializeWindows,windowPaneSegment} from '../src/breach-windows.ts';
import {pointToSegment} from '../src/breach-core.ts';
test('floor-height glass has a cut opening and transparent physical movement barrier',()=>{
 let count=0;
 for(let seed=1;seed<=66;seed++){
  const site=generateSite(seed);
  for(const pane of (site.windows??[]).filter(w=>w.sillHeight===0)){
   count++;assert.equal(pane.headHeight,39);
   assert.ok(pane.width>=35);
   const pt={x:pane.x,y:pane.y};
   assert.ok(site.walls.every(w=>pointToSegment(pt,w)>2));
   assert.ok(site.cover.some(c=>c.fixture==='glass-barrier'&&Math.hypot(c.x-pt.x,c.y-pt.y)<.001));
   const state=initializeWindows([pane])[0];
   assert.equal(state.shattered,false);
   const seg=windowPaneSegment(state);
   assert.ok(Math.hypot(seg.b.x-seg.a.x,seg.b.y-seg.a.y)>=35);
  }
 }
 assert.ok(count>=2,'commercial sites should generate tall glazed facades');
});
