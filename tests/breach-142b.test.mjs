import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('142B: physical windows have real wall gaps and blocking sills',()=>{
 for(let seed=1;seed<=35;seed++){
   const site=generateSite(seed);
   assert.ok(site.windows?.length,'windows present: '+seed);
   const windowColliders=site.cover.filter(c=>c.fixture==='window-sill'||c.fixture==='glass-barrier');
   assert.equal(windowColliders.length,site.windows.length,'physical glazing: '+seed);
   for(const w of site.windows){
     const kind=w.sillHeight===0?'glass-barrier':'window-sill';
     assert.equal(windowColliders.filter(c=>c.fixture===kind&&
       Math.hypot(c.x-w.x,c.y-w.y)<.001).length,1,'one matching barrier per window: '+seed);
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