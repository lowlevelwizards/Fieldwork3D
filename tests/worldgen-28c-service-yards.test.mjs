import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceYardEdgeCandidates,SERVICE_EDGE_FIXTURES}
 from '../src/worldgen/service-yard-layout.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';

test('real industrial service equipment stays alongside a perimeter work pad',()=>{
 const zone={id:'rear-property',kind:'service',x:200,y:250,w:260,h:100};
 const points=serviceYardEdgeCandidates(zone,40,30);
 assert.ok(points.length>=4);
 assert.ok(points.every(p=>Math.abs(p.y-zone.y)>=20));
 assert.ok(points.every(p=>
  p.x-20>=zone.x-zone.w/2+11&&p.x+20<=zone.x+zone.w/2-11));
 assert.deepEqual(serviceYardEdgeCandidates({...zone,kind:'yard'},40,30),[]);
 assert.equal(SERVICE_EDGE_FIXTURES.has('dumpster'),true);
});
test('industrial rear-yard generated fixtures use perimeter positions, deterministically',()=>{
 const site={seed:20,archetype:'garage',entrySide:'south',
  rooms:[{id:'B',kind:'room',purpose:'bay',x:225,y:230,w:250,h:200}],
  bounds:{minX:0,minY:0,maxX:700,maxY:700},cover:[],doors:[
   {id:'FRONT',a:{x:326,y:430},b:{x:374,y:430}}],
  entrance:{x:350,y:430},spawn:[],enemies:[],
  objective:{x:-50,y:-50},extract:{x:-50,y:-50}};
 const a=addExteriorProperty(site,20);
 const b=addExteriorProperty(site,20);
 assert.deepEqual(a.cover,b.cover);
 const rear=a.exteriorZones.find(z=>z.id==='rear-property');
 assert.ok(rear&&rear.kind==='service');
 const placed=a.cover.filter(o=>SERVICE_EDGE_FIXTURES.has(o.fixture)&&
  o.x>=rear.x-rear.w/2&&o.x<=rear.x+rear.w/2&&
  o.y>=rear.y-rear.h/2&&o.y<=rear.y+rear.h/2);
 assert.ok(placed.length>0);
 for(const item of placed){
  const positions=serviceYardEdgeCandidates(rear,item.w,item.h);
  assert.ok(positions.some(p=>p.x===item.x&&p.y===item.y));
 }
});
