import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('142B: physical windows have real wall gaps and blocking sills',()=>{
 for(let seed=1;seed<=35;seed++){
   const site=generateSite(seed);
   assert.ok(site.windows?.length,'windows present: '+seed);
   for(const pane of site.windows){
     const expected=pane.sillHeight===0?'glass-barrier':'window-sill';
     assert.ok(site.cover.some(c=>c.fixture===expected&&
       Math.hypot(c.x-pane.x,c.y-pane.y)<1),
       'missing physical window obstacle: '+pane.id+' seed '+seed);
   }
   for(const hatch of site.openings??[]){
     if(hatch.kind!=='serving')continue;
     const center={x:(hatch.a.x+hatch.b.x)/2,y:(hatch.a.y+hatch.b.y)/2};
     assert.ok(site.cover.some(c=>c.fixture==='window-sill'&&c.low&&
       Math.hypot(c.x-center.x,c.y-center.y)<1),
       'missing service parapet: '+hatch.id+' seed '+seed);
   }
   assert.ok(site.cover.some(c=>c.fixture&&c.fixture!=='window-sill'),
     'location-specific room cover still exists: '+seed);
   activateSite(site);
   assert.ok(site.spawn.every(p=>passable(p)));
   assert.ok(passable(site.objective));
   assert.ok(route(site.spawn[0],site.objective).length);
 }
 activateSite(null);
});