import test from 'node:test';
import assert from 'node:assert/strict';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
import {generateSite} from '../src/breach-site.ts';
test('front arrival path follows real door rather than an arbitrary lot center',()=>{
 const zone={id:'arrival-forecourt',kind:'yard',x:200,y:300,w:250,h:80};
 const site={seed:3,entrySide:'south',doors:[{id:'FRONT',
   a:{x:115,y:260},b:{x:163,y:260}}],exteriorZones:[zone]};
 const paths=planPropertySurfaces(site).filter(m=>m.kind==='path');
 assert.equal(paths.length,1);
 assert.equal(paths[0].x,139);
 assert.notEqual(paths[0].x,zone.x);
 assert.deepEqual(planPropertySurfaces(site),planPropertySurfaces(site));
});
test('drainage only belongs on paved industrial exterior zones',()=>{
 const zones=[{id:'service',kind:'service',x:160,y:220,w:220,h:75},
  {id:'garden',kind:'garden',x:160,y:330,w:220,h:75}];
 const site={entrySide:'south',doors:[],exteriorZones:zones};
 const drain=planPropertySurfaces(site).filter(m=>m.kind==='drainage-grate');
 assert.equal(drain.length,1);
 assert.equal(drain[0].zoneId,'service');
});
test('live property markings remain within their actual exterior zones',()=>{
 let drains=0,paths=0;
 for(let seed=0;seed<120;seed++){
  const site=generateSite(seed);
  for(const mark of planPropertySurfaces(site)){
   const zone=site.exteriorZones?.find(z=>z.id===mark.zoneId);
   assert.ok(zone);
   assert.ok(mark.x-mark.width/2>=zone.x-zone.w/2-1);
   assert.ok(mark.y-mark.depth/2>=zone.y-zone.h/2-1);
   if(mark.kind==='drainage-grate')drains++;
   if(mark.kind==='path')paths++;
  }
 }
 assert.ok(drains>0&&paths>0);
});
