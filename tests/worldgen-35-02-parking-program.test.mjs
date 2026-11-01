import test from 'node:test';
import assert from 'node:assert/strict';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {overlapsArrivalLane} from '../src/worldgen/property-access-lane.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('marked reserved bay and transfer stripe stay separate from front arrival',()=>{
 for(const side of ['south','east']){
  const horizontal=side==='south';
  const zone={id:'arrival-forecourt',kind:'parking',
   x:horizontal?220:320,y:horizontal?320:220,
   w:horizontal?300:108,h:horizontal?108:300};
  const door=horizontal?
   {a:{x:203,y:267},b:{x:251,y:267}}:
   {a:{x:267,y:203},b:{x:267,y:251}};
  const site={entrySide:side,doors:[{id:'FRONT',...door}],
   entrance:{x:227,y:227},exteriorZones:[zone]};
  const m=planPropertySurfaces(site);
  assert.equal(m.filter(x=>x.kind==='reserved-parking').length,1);
  assert.equal(m.filter(x=>x.kind==='access-hatch').length,3);
  for(const x of m){
   assert.ok(x.x-x.width/2>=zone.x-zone.w/2-1);
   assert.ok(x.y-x.depth/2>=zone.y-zone.h/2-1);
   assert.ok(x.x+x.width/2<=zone.x+zone.w/2+1);
   assert.ok(x.y+x.depth/2<=zone.y+zone.h/2+1);
  }
 }
});
test('wheel stops retain their real canonical physical footprint when placed',()=>{
 const block=propDefinition('parking-block');
 assert.deepEqual([block.width,block.depth],[39,11]);
 const site={archetype:'clinic',seed:6,entrySide:'south',
  rooms:[{id:'R',kind:'room',purpose:'waiting',x:90,y:50,w:240,h:130,tone:0}],
  walls:[],doors:[{id:'FRONT',a:{x:186,y:180},b:{x:234,y:180}}],
  spawn:[],enemies:[],objective:{x:210,y:100},
  extract:{x:210,y:240},entrance:{x:210,y:225},cover:[],
  bounds:{minX:0,minY:0,maxX:510,maxY:550}};
 const result=addExteriorProperty(site,6);
 for(const z of result.exteriorZones??[]){
  if(z.kind!=='parking')continue;
  for(const o of result.cover.filter(x=>x.fixture==='parking-block')){
   assert.ok(o.w===39&&o.h===11||o.w===11&&o.h===39);
   assert.equal(overlapsArrivalLane(result,z,o),false);
  }
 }
 assert.deepEqual(result,addExteriorProperty(site,6));
});
